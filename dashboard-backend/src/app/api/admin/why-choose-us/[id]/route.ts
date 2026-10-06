// src/app/api/admin/why-choose-us/[id]/route.ts
// Single-document: GET + PUT (actions & field edits) + DELETE
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import WhyChooseUs from '@/modal/WhyChooseUs';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePath, revalidateTag } from 'next/cache';
import { withCacheInvalidation } from '@/lib/cache';
import { toWhyChooseItem } from '@/modal/WhyChooseUs.helpers';

interface Params { params: Promise<{ id: string }> }

// ─── GET: single doc ──────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const doc = await WhyChooseUs.findById(id).lean();
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ data: toWhyChooseItem(doc) });
    } catch (err) {
        console.error('[GET /api/admin/why-choose-us/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PUT: action or field edit ────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const contentType = req.headers.get('content-type') ?? '';

        // ── JSON actions ─────────────────────────────────────────
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { action, isActive, adminNote } = body;

            const doc = await WhyChooseUs.findById(id);
            if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            const pushNote = (message: string, type: 'status_change' | 'general' = 'status_change') =>
                doc.adminNotes.push({ message, type, createdAt: new Date(), createdBy: 'admin' });

            // approve — sets status; admin still needs to activate separately
            if (action === 'approve') {
                doc.status = 'approved';
                pushNote('Approved.');
                await doc.save();
                revalidateTag('why-choose-us');
                revalidatePath('/');
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            // reject
            if (action === 'reject') {
                doc.status = 'rejected';
                doc.isActive = false;
                pushNote('Rejected.');
                await doc.save();
                revalidateTag(`why-choose-us-${doc.site}`);
                revalidatePath('/');
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            // activate — makes this doc the live one for its site
            // (pre-save hook deactivates the previous active doc automatically)
            if (action === 'activate') {
                if (doc.status !== 'approved')
                    return NextResponse.json({ error: 'Document must be approved before activating' }, { status: 400 });
                doc.isActive = true;
                pushNote('Activated — now live on site.');
                await doc.save();   // pre-save hook deactivates previous
                await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                    },
                    body: JSON.stringify({ paths: ['/'] }),
                });
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            // deactivate
            if (action === 'deactivate') {
                doc.isActive = false;
                pushNote('Deactivated.');
                await doc.save();
                await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                    },
                    body: JSON.stringify({ paths: ['/'] }),
                });
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            // toggle-active shorthand
            if (action === 'toggle-active') {
                const next = isActive !== undefined ? isActive : !doc.isActive;
                if (next && doc.status !== 'approved')
                    return NextResponse.json({ error: 'Document must be approved before activating' }, { status: 400 });
                doc.isActive = next;
                pushNote(`Visibility toggled to ${next ? 'active' : 'inactive'}.`);
                await doc.save();
                await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                    },
                    body: JSON.stringify({ paths: ['/'] }),
                });
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            // pending (send back for review)
            if (action === 'pending') {
                doc.status = 'pending';
                doc.isActive = false;
                pushNote('Moved back to pending.');
                await doc.save();
                await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                    },
                    body: JSON.stringify({ paths: ['/'] }),
                });
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            // admin note
            if (adminNote) {
                pushNote(adminNote, 'general');
                await doc.save();
                await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                    },
                    body: JSON.stringify({ paths: ['/'] }),
                });
                return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });
            }

            return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
        }

        // ── FormData: field edits ─────────────────────────────────
        const fd = await req.formData();
        const doc = await WhyChooseUs.findById(id);
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Section text
        const tagline = fd.get('tagline') as string | null;
        const title = fd.get('title') as string | null;
        const paragraph = fd.get('paragraph') as string | null;
        if (tagline) doc.sectionText.tagline = tagline;
        if (title) doc.sectionText.title = title;
        if (paragraph) doc.sectionText.paragraph = paragraph;

        // YouTube ID
        const youtubeId = fd.get('youtubeId') as string | null;
        if (youtubeId) doc.video.youtubeId = youtubeId;

        // Thumbnail
        const thumbnailFile = fd.get('thumbnailFile') as File | null;
        if (thumbnailFile) {
            doc.video.thumbnailUrl = await uploadImage(thumbnailFile, 'why-choose-us/thumbnails');
        } else {
            const u = fd.get('thumbnailUrl') as string | null;
            if (u) doc.video.thumbnailUrl = u;
        }

        // Play-button
        const playBtnFile = fd.get('playButtonFile') as File | null;
        if (playBtnFile) {
            doc.video.playButtonImageUrl = await uploadImage(playBtnFile, 'why-choose-us/play-buttons');
        } else {
            const u = fd.get('playButtonImageUrl') as string | null;
            if (u) doc.video.playButtonImageUrl = u;
        }

        // Skill bars
        const skillBarsRaw = fd.get('skillBars') as string | null;
        if (skillBarsRaw) {
            try { doc.skillBars = JSON.parse(skillBarsRaw); }
            catch { return NextResponse.json({ error: 'skillBars must be valid JSON' }, { status: 400 }); }
        }

        // Site change (rare but supported)
        const site = fd.get('site') as string | null;
        if (site && site !== doc.site) {
            // Deactivate on old site cache
            await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                },
                body: JSON.stringify({ paths: [`/why-choose-us-${doc.site}`] }),
            });
            doc.site = site;
            doc.isActive = false; // must re-activate on new site
        }

        await withCacheInvalidation(
            async () => doc.save(),
            ['why-choose-us', `why-choose-us-${doc.site}`]
        );

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ data: toWhyChooseItem(doc.toObject()) });

    } catch (err) {
        console.error('[PUT /api/admin/why-choose-us/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: single ───────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const doc = await WhyChooseUs.findByIdAndDelete(id);
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        revalidateTag(`why-choose-us-${doc.site}`);
        revalidateTag('why-choose-us');
        revalidatePath('/');

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('[DELETE /api/admin/why-choose-us/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}