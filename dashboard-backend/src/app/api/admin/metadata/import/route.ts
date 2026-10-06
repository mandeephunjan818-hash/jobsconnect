import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';   // adjust path if needed
import Metadata from '@/modal/Metadata';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { items } = await req.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'No items provided' },
                { status: 400 }
            );
        }

        let inserted = 0;
        let updated = 0;
        let errors = 0;

        for (const item of items) {
            try {
                // Basic validation
                if (!item.urlPattern || !item.title) {
                    errors++;
                    continue;
                }

                // Prepare update data
                const { _id, ...updateData } = item;
                // Convert boolean if needed
                if (typeof updateData.isActive === 'string') {
                    updateData.isActive = updateData.isActive.toLowerCase() === 'active';
                }

                // Upsert: find by urlPattern (or by id if provided)
                const filter = item.id ? { _id: item.id } : { urlPattern: item.urlPattern, siteId: item.siteId ?? '*' };
                const result = await Metadata.findOneAndUpdate(
                    filter,
                    { $set: { ...updateData, siteId: item.siteId ?? '*' } },
                    { upsert: true, new: true }
                );

                if (result.isNew) {
                    inserted++;
                } else {
                    updated++;
                }
            } catch (err) {
                console.error('Error processing item:', item, err);
                errors++;
            }
        }

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({
            message: 'Import completed',
            inserted,
            updated,
            errors,
        });
    } catch (error) {
        console.error('[IMPORT /api/admin/metadata]', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}