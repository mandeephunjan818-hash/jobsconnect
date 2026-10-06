// src/app/api/admin/services/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Service from '@/modal/Service';
import Listing from '@/modal/Listing';
import ListingDraft from '@/modal/Listingdraft';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import { scheduleService, cancelScheduledService } from '@/lib/serviceScheduler';
import { withCacheInvalidation } from '@/lib/cache';
import { toServiceItem } from "@/modal/Service";


interface Params { params: Promise<{ id: string }> }

/**
 * Rename a category string across every listing/draft that references it.
 * Listings store categories as raw strings (not a Service _id reference),
 * so a category title edit otherwise silently orphans every listing that
 * had the old value selected.
 */
async function cascadeCategoryRename(oldTitle: string, newTitle: string) {
    if (!oldTitle || !newTitle || oldTitle === newTitle) return;
    const arrayFilters = [{ elem: oldTitle }];
    await Promise.all([
        Listing.updateMany(
            { categories: oldTitle },
            { $set: { 'categories.$[elem]': newTitle } },
            { arrayFilters },
        ),
        ListingDraft.updateMany(
            { categories: oldTitle },
            { $set: { 'categories.$[elem]': newTitle } },
            { arrayFilters },
        ),
    ]);
}

/**
 * Strip a category string from every listing/draft that references it.
 * Called when a Service (category) is deleted, so listings don't keep
 * pointing at a category pill that no longer exists anywhere.
 */
async function cascadeCategoryDelete(title: string) {
    if (!title) return;
    await Promise.all([
        Listing.updateMany({ categories: title }, { $pull: { categories: title } }),
        ListingDraft.updateMany({ categories: title }, { $pull: { categories: title } }),
    ]);
}

// ─── GET: single service ──────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const doc = await Service.findById(id).lean();
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ data: toServiceItem(doc) });
    } catch (err) {
        console.error('[GET /api/admin/services/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PUT: update fields or perform action ─────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const contentType = req.headers.get('content-type') ?? '';

        // ── JSON: status actions + notes ────────────────────────
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { action, publishAt: publishAtStr, isActive, adminNote } = body;

            const service = await Service.findById(id);
            if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            const pushNote = (
                message: string,
                type: 'status_change' | 'general' = 'status_change'
            ) => service.adminNotes.push({ message, type, createdAt: new Date(), createdBy: 'admin' });

            // ── publish ──────────────────────────────────────────
            if (action === 'publish') {
                cancelScheduledService(id);
                service.status = 'published';
                service.isActive = true;
                service.publishAt = undefined;
                pushNote('Published immediately.');
                await service.save();
                revalidatePath('/'); revalidatePath('/categories');
                return NextResponse.json({ data: toServiceItem(service.toObject()) });
            }

            // ── schedule ─────────────────────────────────────────
            if (action === 'schedule') {
                if (!publishAtStr)
                    return NextResponse.json({ error: 'publishAt required' }, { status: 400 });
                const publishAt = new Date(publishAtStr);
                const max = new Date(Date.now() + 24 * 60 * 60 * 1000);
                if (publishAt <= new Date())
                    return NextResponse.json({ error: 'publishAt must be in the future' }, { status: 400 });
                if (publishAt > max)
                    return NextResponse.json({ error: 'publishAt must be within 24 hours' }, { status: 400 });

                cancelScheduledService(id);
                service.status = 'scheduled';
                service.isActive = false;
                service.publishAt = publishAt;
                pushNote(`Scheduled for ${publishAt.toISOString()}.`);
                await service.save();
                scheduleService(id, publishAt);
                return NextResponse.json({ data: toServiceItem(service.toObject()) });
            }

            // ── archive ───────────────────────────────────────────
            if (action === 'archive') {
                cancelScheduledService(id);
                service.status = 'archived';
                service.isActive = false;
                service.publishAt = undefined;
                pushNote('Archived.');
                await service.save();
                revalidatePath('/'); revalidatePath('/categories');
                return NextResponse.json({ data: toServiceItem(service.toObject()) });
            }

            // ── back to draft ─────────────────────────────────────
            if (action === 'draft') {
                cancelScheduledService(id);
                service.status = 'draft';
                service.isActive = false;
                service.publishAt = undefined;
                pushNote('Moved back to draft.');
                await service.save();
                revalidatePath('/'); revalidatePath('/categories');
                return NextResponse.json({ data: toServiceItem(service.toObject()) });
            }

            // ── toggle visibility ─────────────────────────────────
            if (action === 'toggle-active') {
                service.isActive = isActive !== undefined ? isActive : !service.isActive;
                pushNote(`Visibility toggled to ${service.isActive ? 'visible' : 'hidden'}.`);
                await service.save();
                revalidatePath('/'); revalidatePath('/categories');
                return NextResponse.json({ data: toServiceItem(service.toObject()) });
            }

            // ── add admin note ────────────────────────────────────
            if (adminNote) {
                pushNote(adminNote, 'general');
                await service.save();
                return NextResponse.json({ data: toServiceItem(service.toObject()) });
            }

            return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
        }

        // ── FormData: field edits ────────────────────────────────
        const formData = await req.formData();
        const service = await Service.findById(id);
        if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const number = formData.get('number') as string | null;
        const title = formData.get('title') as string | null;
        const description = formData.get('description') as string | null;
        const link = formData.get('link') as string | null;
        const order = formData.get('order') as string | null;
        const statusField = formData.get('status') as string | null;
        const publishAtStr = formData.get('publishAt') as string | null;

        // Capture the old title BEFORE overwriting, so we can cascade the
        // rename into every listing/draft that references it by string.
        const oldTitle = service.title;

        // Check number uniqueness if changed
        if (number && number !== service.number) {
            const conflict = await Service.findOne({ number });
            if (conflict && conflict._id.toString() !== id)
                return NextResponse.json({ error: 'Number already exists' }, { status: 409 });
            service.number = number;
        }
        if (title) service.title = title;
        if (description) service.description = description;
        if (link) service.link = link;
        if (order) service.order = parseInt(order, 10);

        // Handle status change via form (e.g. edit modal status dropdown)
        if (statusField && statusField !== service.status) {
            cancelScheduledService(id);
            const publishAt = publishAtStr ? new Date(publishAtStr) : undefined;
            const isScheduled = statusField === 'scheduled' && publishAt && publishAt > new Date();
            const isPublished = statusField === 'published';

            service.status = isScheduled ? 'scheduled' : statusField as any;
            service.isActive = isPublished;
            service.publishAt = isScheduled ? publishAt : undefined;

            service.adminNotes.push({
                message: `Status changed to '${service.status}'.`,
                type: 'status_change',
                createdAt: new Date(),
                createdBy: 'admin',
            });

            if (isScheduled && publishAt) scheduleService(id, publishAt);
        }

        // Images
        const imageFile = formData.get('imageFile') as File | null;
        const shapeImageFile = formData.get('shapeImageFile') as File | null;
        if (imageFile) {
            service.imageUrl = await uploadImage(imageFile, 'services/main');
        } else {
            const u = formData.get('imageUrl') as string | null;
            if (u) service.imageUrl = u;
        }
        if (shapeImageFile) {
            service.shapeImageUrl = await uploadImage(shapeImageFile, 'services/shape');
        } else {
            const u = formData.get('shapeImageUrl') as string | null;
            if (u) service.shapeImageUrl = u;
        }

        await withCacheInvalidation(
            async () => service.save(),
            ['services', 'admin-services']
        );

        // ── Cascade the rename into every listing/draft that had the old
        // category title selected. Must run AFTER save() so `service.title`
        // reflects the new value, and uses oldTitle captured above.
        if (title) {
            await cascadeCategoryRename(oldTitle, service.title);
        }

        revalidatePath('/'); revalidatePath('/categories');
        revalidatePath('/jobs'); // categories changed on N listings — refresh the listing index too
        return NextResponse.json({ data: toServiceItem(service.toObject()) });

    } catch (err) {
        console.error('[PUT /api/admin/services/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: single ───────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        cancelScheduledService(id);

        // Need the doc's title before deleting, to cascade-strip it
        // from every listing/draft that has it selected.
        const service = await Service.findByIdAndDelete(id);
        if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await cascadeCategoryDelete(service.title);

        revalidatePath('/'); revalidatePath('/categories');
        revalidatePath('/jobs');
        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('[DELETE /api/admin/services/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}