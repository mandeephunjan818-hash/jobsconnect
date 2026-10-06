// src/app/api/admin/brands/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Brand from '@/modal/Brand';
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
                // Minimum required fields
                if (!item.name || !item.companyType) { errors++; continue; }

                const { _id, id, ...data } = item;

                // Defaults
                if (data.isActive === undefined) data.isActive = true;
                if (data.order === undefined) data.order = 0;
                if (!data.visibleOnSites) data.visibleOnSites = [];
                if (!data.address) data.address = {};

                // Coerce string booleans from Excel
                if (typeof data.isActive === 'string') data.isActive = data.isActive !== 'false';

                // Coerce visibleOnSites: might be a comma-separated string from Excel
                if (typeof data.visibleOnSites === 'string') {
                    data.visibleOnSites = data.visibleOnSites
                        .split(',').map((s: string) => s.trim()).filter(Boolean);
                }

                // Ensure logoAlt has a fallback
                if (!data.logoAlt) data.logoAlt = data.name;

                // Track cache-bust sites
                (data.visibleOnSites as string[]).forEach(s => affectedSites.add(s));

                // Upsert: match on name (unique enough for import)
                const existing = await Brand.findOne({ name: item.name });

                if (existing) {
                    Object.assign(existing, data);
                    await existing.save();
                    updated++;
                } else {
                    await Brand.create(data);
                    inserted++;
                }
            } catch (err) {
                console.error('[Import] Error on item:', item?.name, err);
                errors++;
            }
        }

        affectedSites.forEach(s => revalidateTag(`brands-${s}`));
        revalidateTag('brands');
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
        console.error('[POST /api/admin/brands/import]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}