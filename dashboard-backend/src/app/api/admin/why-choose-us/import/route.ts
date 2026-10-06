// src/app/api/admin/why-choose-us/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import WhyChooseUs from '@/modal/WhyChooseUs';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { items } = await req.json();

        if (!Array.isArray(items) || !items.length)
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });

        let inserted = 0, updated = 0, errors = 0;
        const affectedSites = new Set<string>();

        for (const item of items) {
            try {
                // Minimum required fields for import
                if (!item.site || !item.title) { errors++; continue; }

                const { _id, id, ...data } = item;

                // Defaults
                if (!data.status) data.status = 'pending';
                if (!data.submittedBy) data.submittedBy = 'import';
                data.isActive = false; // never auto-activate on import

                // Rebuild nested structure if flat fields are provided
                if (!data.sectionText) {
                    data.sectionText = {
                        tagline: data.tagline || '',
                        title: data.title || '',
                        paragraph: data.paragraph || '',
                    };
                }
                if (!data.video) {
                    data.video = {
                        youtubeId: data.youtubeId || '',
                        thumbnailUrl: data.thumbnailUrl || '',
                        playButtonImageUrl: data.playButtonImageUrl || '',
                    };
                }
                if (!data.skillBars) data.skillBars = [];

                // Clean up flat fields that are now nested
                delete data.tagline; delete data.title; delete data.paragraph;
                delete data.youtubeId; delete data.thumbnailUrl; delete data.playButtonImageUrl;

                affectedSites.add(item.site);

                // Try to find existing doc by site + same title to update
                const existing = await WhyChooseUs.findOne({
                    site: item.site,
                    'sectionText.title': item.title,
                });

                if (existing) {
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
                    updated++;
                } else {
                    await WhyChooseUs.create({
                        ...data,
                        adminNotes: [{
                            message: `Created via import on ${new Date().toISOString()}.`,
                            type: 'status_change',
                            createdAt: new Date(),
                            createdBy: 'import',
                        }],
                    });
                    inserted++;
                }
            } catch (err) {
                console.error('[Import] Error on item:', item?.site, item?.title, err);
                errors++;
            }
        }

        affectedSites.forEach(s => revalidateTag(`why-choose-us-${s}`));
        revalidateTag('why-choose-us');
        revalidatePath('/');

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ message: 'Import completed', inserted, updated, errors });
    } catch (err) {
        console.error('[POST /api/admin/why-choose-us/import]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}