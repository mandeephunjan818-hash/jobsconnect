import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Metadata from '@/modal/Metadata';
import { uploadImage } from '@/lib/cloudinary';
import { KNOWN_SITES } from '@/lib/sites';

interface Params { params: Promise<{ id: string }> }

export interface MetadataItem {
    id: string;
    urlPattern: string;
    siteId: string;
    title: string;
    logo: string;
    logoAlt: string;
    logoTitle: string;
    description: string;
    keywords: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogImageTitle?: string;
    canonicalUrl?: string;
    robots?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MetadataApiResponse {
    data: MetadataItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

export interface MetadataApiError {
    error: string;
}

// ─── GET /apis/admin/metadata/:id ───────────────────────────
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const search = sp.get('search') || '';
        const isActive = sp.get('isActive'); // 'true', 'false', or null
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

        // Sorting
        const sortBy = sp.get('sortBy') || 'createdAt';
        const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

        // Date filters
        const createdFrom = sp.get('createdFrom');
        const createdTo = sp.get('createdTo');
        const updatedFrom = sp.get('updatedFrom');
        const updatedTo = sp.get('updatedTo');
        const siteId = sp.get('siteId') || undefined;           // ← ADD

        const query: any = {};
        // Search across multiple fields
        if (search) {
            query.$or = [
                { urlPattern: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { keywords: { $regex: search, $options: 'i' } },
            ];
        }

        // Filter by active status
        if (isActive !== null) {
            query.isActive = isActive === 'true';
        }

        // Date range filters
        if (createdFrom || createdTo) {
            query.createdAt = {};
            if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
            if (createdTo) {
                const end = new Date(createdTo);
                end.setHours(23, 59, 59, 999); // include entire day
                query.createdAt.$lte = end;
            }
        }

        if (updatedFrom || updatedTo) {
            query.updatedAt = {};
            if (updatedFrom) query.updatedAt.$gte = new Date(updatedFrom);
            if (updatedTo) {
                const end = new Date(updatedTo);
                end.setHours(23, 59, 59, 999);
                query.updatedAt.$lte = end;
            }
        }

        if (siteId) query.siteId = siteId;

        const skip = (page - 1) * perPage;

        const [metadataList, total] = await Promise.all([
            Metadata.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(perPage)
                .lean(),
            Metadata.countDocuments(query),
        ]);

        const data: MetadataItem[] = metadataList.map((doc: any) => ({
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
            createdAt: doc.createdAt?.toISOString(),
            updatedAt: doc.updatedAt?.toISOString(),
        }));

        return NextResponse.json(
            {
                data,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
            { status: 200 }
        );
    } catch (err) {
        console.error('[GET /apis/admin/metadata]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PUT /apis/admin/metadata/:id ───────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const metadata = await Metadata.findById(id);
        if (!metadata) {
            return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
        }

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

        if (body.siteId) {
            const validSiteIds = [...KNOWN_SITES, '*'];
            if (!validSiteIds.includes(body.siteId)) {
                return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
            }
        }

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

        // If urlPattern is being changed, check uniqueness
        const effectiveSiteId = body.siteId ?? metadata.siteId;
        const patternChanged = body.urlPattern && body.urlPattern !== metadata.urlPattern;
        const siteChanged = body.siteId && body.siteId !== metadata.siteId;

        if (patternChanged || siteChanged) {
            const existing = await Metadata.findOne({
                urlPattern: body.urlPattern ?? metadata.urlPattern,
                siteId: effectiveSiteId,
                _id: { $ne: metadata._id },
            });
            if (existing) {
                return NextResponse.json(
                    { error: 'Metadata for this URL pattern and site already exists' },
                    { status: 409 }
                );
            }
        }

        Object.assign(metadata, body);
        await metadata.save();

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({ message: 'Metadata updated successfully' });
    } catch (err) {
        console.error('[PUT /apis/admin/metadata/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE /apis/admin/metadata/:id ────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const metadata = await Metadata.findByIdAndDelete(id);
        if (!metadata) {
            return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
        }

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us', '/jobs', '/blog', '/contact-us', '/faq', '/jobs/[slug]', '/blog/[slug]'] }),
        });

        return NextResponse.json({ message: 'Metadata deleted successfully' });
    } catch (err) {
        console.error('[DELETE /apis/admin/metadata/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}