import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogComment from '@/modal/BlogComment';

// GET /api/blog-comments?slug=my-post&page=1&perPage=10
// Returns only approved comments for a given slug
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const slug = sp.get('slug');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

        if (!slug) {
            return NextResponse.json({ error: 'slug is required' }, { status: 400 });
        }

        const filter = { blogSlug: slug, isApproved: true };
        const skip = (page - 1) * perPage;

        const [docs, total] = await Promise.all([
            BlogComment.find(filter)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(perPage)
                .lean(),
            BlogComment.countDocuments(filter),
        ]);

        const data = docs.map((doc: any) => ({
            id: doc._id.toString(),
            blogSlug: doc.blogSlug,
            name: doc.name,
            email: doc.email,
            phone: doc.phone,
            message: doc.message,
            isApproved: doc.isApproved,
            parentId: doc.parentId?.toString() ?? null,
            createdAt: doc.createdAt?.toISOString(),
            updatedAt: doc.updatedAt?.toISOString(),
        }));

        return NextResponse.json({
            data,
            total,
            page,
            perPage,
            totalPages: Math.max(1, Math.ceil(total / perPage)),
        });
    } catch (err) {
        console.error('[GET /api/public/blog-comments]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/blog-comments
// Submit a new comment (pending approval)
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const body = await req.json();
        const { blogSlug, name, email, phone, message, parentId } = body;

        if (!blogSlug || !name || !email || !message) {
            return NextResponse.json(
                { error: 'blogSlug, name, email and message are required' },
                { status: 400 }
            );
        }

        const comment = new BlogComment({
            blogSlug,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() ?? undefined,
            message: message.trim(),
            isApproved: true,
            parentId: parentId ?? null,
        });

        await comment.save();

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', `/blog/${blogSlug}`] }),
        });

        return NextResponse.json(
            {
                message: 'Comment submitted and pending approval',
                id: comment._id.toString(),
            },
            { status: 201 }
        );
    } catch (err) {
        console.error('[POST /api/public/blog-comments]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}