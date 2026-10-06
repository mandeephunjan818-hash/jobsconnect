//src/app/api/admin/metadata
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Metadata from '@/modal/Metadata';
import { uploadImage } from '@/lib/cloudinary';
import { KNOWN_SITES } from '@/lib/sites';

export interface MetadataItem {
    id: string;
    urlPattern: string;
    siteId: string;
    title: string;
    logo?: string;
    logoAlt?: string;
    logoTitle?: string;
    description: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogImageTitle?: string;
    canonicalUrl?: string;
    robots?: string;
    isActive: boolean;
}

export interface MetadataApiResponse {
    data: MetadataItem | MetadataItem[] | null;
    total?: number;
}

export interface MetadataApiError {
    error: string;
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const url = req.nextUrl.searchParams.get('url');

        // CASE 1: No url parameter → return all metadata
        if (!url) {
            const allMetadata = await Metadata.find({}).sort({ urlPattern: 1 }).lean();
            const data: MetadataItem[] = allMetadata.map((doc: any) => ({
                id: doc._id.toString(),
                urlPattern: doc.urlPattern,
                siteId: doc.siteId,
                title: doc.title,
                logo: doc.logo,
                logoAlt: doc.logoAlt,
                logoTitle: doc.logoTitle,
                description: doc.description,
                keywords: doc.keywords,
                ogTitle: doc.ogTitle,
                ogDescription: doc.ogDescription,
                ogImage: doc.ogImage,
                ogImageAlt: doc.ogImageAlt,
                ogImageTitle: doc.ogImageTitle,
                canonicalUrl: doc.canonicalUrl,
                robots: doc.robots,
                isActive: doc.isActive,
            }));
            return NextResponse.json({ data, total: data.length }, { status: 200 });
        }

        // CASE 2: url + site → priority-based lookup
        const site = req.nextUrl.searchParams.get('site') || '*';  // ← ADD site param

        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('/')) normalizedUrl = '/' + normalizedUrl;
        if (normalizedUrl.endsWith('/') && normalizedUrl !== '/') {
            normalizedUrl = normalizedUrl.slice(0, -1);
        }

        /*
         * Priority (most → least specific):
         *  1. site-exact    — { siteId: site, urlPattern: '/about' }
         *  2. site-wildcard — { siteId: site, urlPattern: '/blog/*' }
         *  3. global-exact  — { siteId: '*',  urlPattern: '/about' }
         *  4. global-wildcard — { siteId: '*', urlPattern: '/blog/*' }
         *  5. site-default  — { siteId: site, urlPattern: '*' }
         *  6. global-default — { siteId: '*',  urlPattern: '*' }
         */
        const candidates = await Metadata.find({
            siteId: { $in: [site, '*'] },
            isActive: true,
            $or: [
                { urlPattern: normalizedUrl },
                { urlPattern: '*' },
                { urlPattern: { $regex: /\/\*$/ } },
            ],
        }).lean();

        // P1 — site + exact URL
        const p1 = candidates.find(c => c.siteId === site && c.urlPattern === normalizedUrl);
        if (p1) return formatMatch(p1);

        // P2 — site + wildcard URL  
        for (const c of candidates.filter(c => c.siteId === site && c.urlPattern.endsWith('/*'))) {
            if (normalizedUrl.startsWith(c.urlPattern.slice(0, -2))) return formatMatch(c);
        }

        // P3 — global + exact URL
        const p3 = candidates.find(c => c.siteId === '*' && c.urlPattern === normalizedUrl);
        if (p3) return formatMatch(p3);

        // P4 — global + wildcard URL
        for (const c of candidates.filter(c => c.siteId === '*' && c.urlPattern.endsWith('/*'))) {
            if (normalizedUrl.startsWith(c.urlPattern.slice(0, -2))) return formatMatch(c);
        }

        // P5 — site default
        const p5 = candidates.find(c => c.siteId === site && c.urlPattern === '*');
        if (p5) return formatMatch(p5);

        // P6 — global default
        const p6 = candidates.find(c => c.siteId === '*' && c.urlPattern === '*');
        if (p6) return formatMatch(p6);

        return NextResponse.json({ data: null } satisfies MetadataApiResponse, { status: 200 });
    } catch (err) {
        console.error('[GET /apis/public/metadata]', err);
        return NextResponse.json(
            { error: 'Internal server error' } satisfies MetadataApiError,
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const formData = await req.formData();
        const body: any = {};

        // All text fields including alt/title
        const fields = [
            'urlPattern', 'title', 'siteId', 'description', 'keywords', 'ogTitle', 'ogDescription',
            'canonicalUrl', 'robots', 'isActive',
            'logoAlt', 'logoTitle', 'ogImageAlt', 'ogImageTitle'
        ];
        fields.forEach(field => {
            const value = formData.get(field);
            if (value !== null) body[field] = value;
        });

        body.isActive = formData.get('isActive') === 'on';

        // Handle file uploads – only if new file provided
        const logoFile = formData.get('logoFile') as File | null;
        const ogImageFile = formData.get('ogImageFile') as File | null;

        if (logoFile) {
            body.logo = await uploadImage(logoFile, 'metadata/logos');
        } else {
            const logoUrl = formData.get('logo') as string;
            if (logoUrl) body.logo = logoUrl;
            // else keep existing logo
        }

        if (ogImageFile) {
            body.ogImage = await uploadImage(ogImageFile, 'metadata/og');
        } else {
            const ogUrl = formData.get('ogImage') as string;
            if (ogUrl) body.ogImage = ogUrl;
        }


        if (!body.siteId) body.siteId = '*';
        const validSiteIds = [...KNOWN_SITES, '*'];
        if (!validSiteIds.includes(body.siteId)) {
            return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
        }

        const existing = await Metadata.findOne({
            urlPattern: body.urlPattern,
            siteId: body.siteId,
        });
        if (existing) {
            return NextResponse.json(
                { error: 'Metadata for this URL pattern and site already exists' },
                { status: 409 }
            );
        }

        const MetaValues = new Metadata(body);

        await MetaValues.save();

        const data: MetadataItem = {
            id: MetaValues._id.toString(),
            urlPattern: MetaValues.urlPattern,
            siteId: MetaValues.siteId,
            title: MetaValues.title,
            logo: MetaValues.logo,
            logoAlt: MetaValues.logoAlt,
            logoTitle: MetaValues.logoTitle,
            description: MetaValues.description,
            keywords: MetaValues.keywords,
            ogTitle: MetaValues.ogTitle,
            ogDescription: MetaValues.ogDescription,
            ogImage: MetaValues.ogImage,
            ogImageAlt: MetaValues.ogImageAlt,
            ogImageTitle: MetaValues.ogImageTitle,
            canonicalUrl: MetaValues.canonicalUrl,
            robots: MetaValues.robots,
            isActive: MetaValues.isActive,
        };

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({ data }, { status: 201 });
    } catch (err) {
        console.error('[POST /apis/admin/metadata]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function formatMatch(doc: any): NextResponse {
    const data: MetadataItem = {
        id: doc._id.toString(),
        urlPattern: doc.urlPattern,
        siteId: doc.siteId,
        title: doc.title,
        logo: doc.logo,
        logoAlt: doc.logoAlt,
        logoTitle: doc.logoTitle,
        description: doc.description,
        keywords: doc.keywords,
        ogTitle: doc.ogTitle,
        ogDescription: doc.ogDescription,
        ogImage: doc.ogImage,
        ogImageAlt: doc.ogImageAlt,
        ogImageTitle: doc.ogImageTitle,
        canonicalUrl: doc.canonicalUrl,
        robots: doc.robots,
        isActive: doc.isActive,
    };
    return NextResponse.json({ data } satisfies MetadataApiResponse, { status: 200 });
}