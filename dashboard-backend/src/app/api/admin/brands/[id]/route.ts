// src/app/api/admin/brands/[id]/route.ts
// Single-document: GET + PUT (field edits + toggle) + DELETE
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Brand from '@/modal/Brand';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePath, revalidateTag } from 'next/cache';
import { withCacheInvalidation } from '@/lib/cache';
import { toBrandItem } from '@/modal/Brand.helpers';

interface Params { params: Promise<{ id: string }> }

// ─── GET: single doc ──────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const doc = await Brand.findById(id).lean();
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ data: toBrandItem(doc) });
    } catch (err) {
        console.error('[GET /api/admin/brands/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PUT: JSON action OR FormData field edit ──────────────────
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const contentType = req.headers.get('content-type') ?? '';

        // ── JSON actions ──────────────────────────────────────
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { action, isActive } = body;

            const doc = await Brand.findById(id);
            if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            // activate
            if (action === 'activate') {
                doc.isActive = true;
                await doc.save();
                invalidateBrandCaches(doc.visibleOnSites);
                return NextResponse.json({ data: toBrandItem(doc.toObject()) });
            }

            // deactivate
            if (action === 'deactivate') {
                doc.isActive = false;
                await doc.save();
                invalidateBrandCaches(doc.visibleOnSites);
                return NextResponse.json({ data: toBrandItem(doc.toObject()) });
            }

            // toggle-active shorthand
            if (action === 'toggle-active') {
                const next = isActive !== undefined ? isActive : !doc.isActive;
                doc.isActive = next;
                await doc.save();
                invalidateBrandCaches(doc.visibleOnSites);
                return NextResponse.json({ data: toBrandItem(doc.toObject()) });
            }

            return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
        }

        // ── FormData: field edits ─────────────────────────────
        const fd = await req.formData();
        const doc = await Brand.findById(id);
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const oldSites = [...doc.visibleOnSites];

        // Scalar fields
        const name = fd.get('name') as string | null;
        const companyType = fd.get('companyType') as string | null;
        const description = fd.get('description') as string | null;
        const websiteUrl = fd.get('websiteUrl') as string | null;
        const logoAlt = fd.get('logoAlt') as string | null;
        const orderRaw = fd.get('order') as string | null;
        const isActiveRaw = fd.get('isActive') as string | null;

        if (name) doc.name = name;
        if (companyType) doc.companyType = companyType;
        if (description) doc.description = description;
        if (websiteUrl !== null) doc.websiteUrl = websiteUrl;
        if (logoAlt) doc.logoAlt = logoAlt;
        if (orderRaw) doc.order = parseInt(orderRaw, 10);
        if (isActiveRaw !== null) doc.isActive = isActiveRaw !== 'false';

        // Address (each field optional)
        const street = fd.get('street') as string | null;
        const city = fd.get('city') as string | null;
        const province = fd.get('province') as string | null;
        const country = fd.get('country') as string | null;
        const postalCode = fd.get('postalCode') as string | null;
        if (street !== null) doc.address.street = street || undefined;
        if (city !== null) doc.address.city = city || undefined;
        if (province !== null) doc.address.province = province || undefined;
        if (country !== null) doc.address.country = country || undefined;
        if (postalCode !== null) doc.address.postalCode = postalCode || undefined;

        // Logo (file takes priority over URL)
        const logoFile = fd.get('logoFile') as File | null;
        if (logoFile) {
            doc.logoUrl = await uploadImage(logoFile, 'brands/logos');
        } else {
            const u = fd.get('logoUrl') as string | null;
            if (u) doc.logoUrl = u;
        }

        // visibleOnSites
        const sitesRaw = fd.get('visibleOnSites') as string | null;
        if (sitesRaw) {
            try { doc.visibleOnSites = JSON.parse(sitesRaw); }
            catch { return NextResponse.json({ error: 'visibleOnSites must be valid JSON array' }, { status: 400 }); }
        }

        await withCacheInvalidation(
            async () => doc.save(),
            ['brands', ...doc.visibleOnSites.map((s: string) => `brands-${s}`), ...oldSites.map((s: string) => `brands-${s}`)],
        );

        revalidatePath('/');

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ data: toBrandItem(doc.toObject()) });

    } catch (err) {
        console.error('[PUT /api/admin/brands/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: single ───────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const doc = await Brand.findByIdAndDelete(id);
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        invalidateBrandCaches(doc.visibleOnSites);
        revalidatePath('/');

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('[DELETE /api/admin/brands/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── Shared cache invalidation helper ────────────────────────
function invalidateBrandCaches(sites: string[]) {
    sites.forEach(s => revalidateTag(`brands-${s}`));
    revalidateTag('brands');
    revalidatePath('/');
}