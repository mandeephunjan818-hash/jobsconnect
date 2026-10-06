//src/app/api/siteConfig/[id]/route

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import SiteConfig from '@/modal/SiteConfig';
import { uploadImage } from '@/lib/cloudinary';
import { SiteConfigItem } from '../route';

/* ─── Shared formatter ─────────────────────────────────────────────────── */
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

/* ─── PUT  /api/admin/site-config/[id] ─────────────────────────────────── */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const config = await SiteConfig.findById(id);
        if (!config) {
            return NextResponse.json({ error: 'Site config not found' }, { status: 404 });
        }

        const formData = await req.formData();
        const str = (key: string): string | null => formData.get(key) as string | null;

        /* ── Images ────────────────────────────────────────────────────────── */
        const logoFile = formData.get('logoFile') as File | null;
        const faviconFile = formData.get('faviconFile') as File | null;
        const ogImageFile = formData.get('ogImageFile') as File | null;

        if (logoFile && logoFile.size > 0) {
            try { config.logoUrl = await uploadImage(logoFile, 'site-config/logos'); }
            catch { return NextResponse.json({ error: 'Logo upload failed' }, { status: 500 }); }
        } else {
            const v = str('logoUrl');
            if (v !== null) config.logoUrl = v || undefined;
        }

        if (faviconFile && faviconFile.size > 0) {
            try { config.faviconUrl = await uploadImage(faviconFile, 'site-config/favicons'); }
            catch { return NextResponse.json({ error: 'Favicon upload failed' }, { status: 500 }); }
        } else {
            const v = str('faviconUrl');
            if (v !== null) config.faviconUrl = v || undefined;
        }

        if (ogImageFile && ogImageFile.size > 0) {
            try { config.ogImageUrl = await uploadImage(ogImageFile, 'site-config/og'); }
            catch { return NextResponse.json({ error: 'OG image upload failed' }, { status: 500 }); }
        } else {
            const v = str('ogImageUrl');
            if (v !== null) config.ogImageUrl = v || undefined;
        }

        /* ── Text fields ───────────────────────────────────────────────────── */
        const textFields = [
            'logoAlt', 'contactEmail', 'phone',
            'address', 'ogTitle', 'ogDescription',
        ] as const;

        for (const key of textFields) {
            const v = str(key);
            if (v !== null) (config as any)[key] = v || undefined;
        }

        /* ── Boolean ───────────────────────────────────────────────────────── */
        const isActiveRaw = str('isActive');
        if (isActiveRaw !== null) config.isActive = isActiveRaw !== 'false';

        await config.save();

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/auth/sign-in', '/auth/sign-up', '/auth/admin-sign-in' , '/about-us', '/dashboard', '/admin/settings', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({ data: formatDoc(config) }, { status: 200 });
    } catch (err) {
        console.error('[PUT /api/admin/site-config/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/* ─── DELETE  /api/admin/site-config/[id] ──────────────────────────────── */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const config = await SiteConfig.findByIdAndDelete(id);
        if (!config) {
            return NextResponse.json({ error: 'Site config not found' }, { status: 404 });
        }

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/',  '/auth/sign-in', '/auth/sign-up', '/auth/admin-sign-in' ,'/about-us', '/dashboard', '/admin/settings', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({ message: 'Site config deleted successfully' }, { status: 200 });
    } catch (err) {
        console.error('[DELETE /api/admin/site-config/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}