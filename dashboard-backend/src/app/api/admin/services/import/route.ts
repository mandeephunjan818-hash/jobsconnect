// src/app/api/admin/services/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Service from '@/modal/Service';
import { revalidatePath } from 'next/cache';
import { scheduleService } from '@/lib/serviceScheduler';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { items } = await req.json();

        if (!Array.isArray(items) || !items.length)
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });

        let inserted = 0, updated = 0, errors = 0;

        for (const item of items) {
            try {
                // Required minimum fields
                if (!item.title || !item.number) { errors++; continue; }

                const { _id, id, ...data } = item;

                // Defaults
                if (!data.status) data.status = 'draft';
                if (data.isActive === undefined) data.isActive = data.status === 'published';
                if (typeof data.order === 'string') data.order = parseInt(data.order, 10) || 0;

                // Defaults for required schema fields that might be missing from import
                if (!data.description) data.description = '';
                if (!data.imageUrl) data.imageUrl = '';
                if (!data.shapeImageUrl) data.shapeImageUrl = '';
                if (!data.link) data.link = '/';

                const existing = await Service.findOne({ number: item.number });

                if (existing) {
                    // Preserve adminNotes and append an import note
                    const existingNotes = existing.adminNotes ?? [];
                    Object.assign(existing, data);
                    existing.adminNotes = [
                        ...existingNotes,
                        {
                            message: `Updated via import on ${new Date().toISOString()}.`,
                            type: 'status_change',
                            createdAt: new Date(),
                            createdBy: 'import',
                        },
                    ];
                    await existing.save();

                    // Re-schedule if still scheduled
                    if (existing.status === 'scheduled' && existing.publishAt) {
                        scheduleService(existing._id.toString(), existing.publishAt);
                    }
                    updated++;
                } else {
                    const created = await Service.create({
                        ...data,
                        adminNotes: [{
                            message: `Created via import on ${new Date().toISOString()}.`,
                            type: 'status_change',
                            createdAt: new Date(),
                            createdBy: 'import',
                        }],
                    });
                    if (created.status === 'scheduled' && created.publishAt) {
                        scheduleService(created._id.toString(), created.publishAt);
                    }
                    inserted++;
                }
            } catch (err) {
                console.error('[Import] Error on item:', item?.number, err);
                errors++;
            }
        }

        revalidatePath('/');
        revalidatePath('/categories');

        return NextResponse.json({
            message: 'Import completed',
            inserted, updated, errors,
        });
    } catch (err) {
        console.error('[POST /api/admin/services/import]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}