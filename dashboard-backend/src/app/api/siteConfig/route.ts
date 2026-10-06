//src/app/api/siteConfig/route

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import SiteConfig from '@/modal/SiteConfig';
import { uploadImage } from '@/lib/cloudinary';
import { KNOWN_SITES } from '@/lib/sites';

/* ─── Shared shape ─────────────────────────────────────────────────────── */
export interface SiteConfigItem {
    id: string;
    siteId: string;
    logoUrl?: string;
    logoAlt?: string;
    faviconUrl?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    isActive: boolean;
    updatedAt?: string;
    createdAt?: string;
}

function formatDoc(doc: any): SiteConfigItem {
    return {
        id: doc._id.toString(),
        siteId: doc.siteId,
        logoUrl: doc.logoUrl,
        logoAlt: doc.logoAlt,
        faviconUrl: doc.faviconUrl,
        contactEmail: doc.contactEmail,
        phone: doc.phone,
        address: doc.address,
        ogTitle: doc.ogTitle,
        ogDescription: doc.ogDescription,
        ogImageUrl: doc.ogImageUrl,
        isActive: doc.isActive ?? true,
        updatedAt: doc.updatedAt?.toISOString(),
        createdAt: doc.createdAt?.toISOString(),
    };
}

/* ─── Shared helper: upload images + extract text fields ───────────────── */
async function extractFields(
    formData: FormData,
    existingLogoUrl?: string,
    existingFaviconUrl?: string,
    existingOgImageUrl?: string,
): Promise<Partial<SiteConfigItem> & { _error?: string }> {

    let logoUrl = (formData.get('logoUrl') as string) ?? existingLogoUrl;
    let faviconUrl = (formData.get('faviconUrl') as string) ?? existingFaviconUrl;
    let ogImageUrl = (formData.get('ogImageUrl') as string) ?? existingOgImageUrl;

    const logoFile = formData.get('logoFile') as File | null;
    const faviconFile = formData.get('faviconFile') as File | null;
    const ogImageFile = formData.get('ogImageFile') as File | null;

    if (logoFile && logoFile.size > 0) {
        try { logoUrl = await uploadImage(logoFile, 'site-config/logos'); }
        catch { return { _error: 'Logo upload failed' }; }
    }
    if (faviconFile && faviconFile.size > 0) {
        try { faviconUrl = await uploadImage(faviconFile, 'site-config/favicons'); }
        catch { return { _error: 'Favicon upload failed' }; }
    }
    if (ogImageFile && ogImageFile.size > 0) {
        try { ogImageUrl = await uploadImage(ogImageFile, 'site-config/og'); }
        catch { return { _error: 'OG image upload failed' }; }
    }

    const str = (key: string) => (formData.get(key) as string) || undefined;

    return {
        logoUrl: logoUrl || undefined,
        logoAlt: str('logoAlt'),
        faviconUrl: faviconUrl || undefined,
        contactEmail: str('contactEmail'),
        phone: str('phone'),
        address: str('address'),
        ogTitle: str('ogTitle'),
        ogDescription: str('ogDescription'),
        ogImageUrl: ogImageUrl || undefined,
        isActive: formData.get('isActive') !== 'false',
    };
}

/* ─── GET  /api/admin/site-config ──────────────────────────────────────── */
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const siteId = req.nextUrl.searchParams.get('siteId') || undefined;
        const query: any = {};
        if (siteId) query.siteId = siteId;

        const configs = await SiteConfig.find(query).lean();
        return NextResponse.json({ data: configs.map(formatDoc) }, { status: 200 });
    } catch (err) {
        console.error('[GET /api/admin/site-config]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/* ─── POST  /api/admin/site-config  (upsert by siteId) ────────────────── */
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const formData = await req.formData();
        const siteId = formData.get('siteId') as string;

        if (!siteId) {
            return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const validSiteIds = [...KNOWN_SITES, '*'];
        if (!validSiteIds.includes(siteId)) {
            return NextResponse.json({ error: `Invalid siteId: "${siteId}"` }, { status: 400 });
        }

        const fields = await extractFields(formData);
        if (fields._error) {
            return NextResponse.json({ error: fields._error }, { status: 500 });
        }
        delete fields._error;

        const config = await SiteConfig.findOneAndUpdate(
            { siteId },
            { $set: { siteId, ...fields } },
            { new: true, upsert: true, runValidators: true },
        );

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/auth/sign-in', '/auth/sign-up', '/auth/admin-sign-in', '/about-us', '/dashboard', '/admin/settings', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({ data: formatDoc(config) }, { status: 200 });
    } catch (err) {
        console.error('[POST /api/admin/site-config]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}