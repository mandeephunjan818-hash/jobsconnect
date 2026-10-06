import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogComment from '@/modal/BlogComment';

interface Params { params: Promise<{ id: string }> }

// GET /api/admin/blog-comments/:id
export async function GET(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const doc = await BlogComment.findById(id).lean() as any;
        if (!doc) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        return NextResponse.json({
            data: {
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
            },
        });
    } catch (err) {
        console.error('[GET /api/admin/blog-comments/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/admin/blog-comments/:id
// Update message or approval status
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const comment = await BlogComment.findById(id);
        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        const body = await req.json();
        const { blogSlug, message, isApproved, phone } = body;

        if (message !== undefined) comment.message = message.trim();
        if (isApproved !== undefined) comment.isApproved = Boolean(isApproved);
        if (phone !== undefined) comment.phone = phone?.trim() ?? undefined;

        await comment.save();

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', `/blog/${blogSlug}`] }),
        });

        return NextResponse.json({ message: 'Comment updated successfully' });
    } catch (err) {
        console.error('[PUT /api/admin/blog-comments/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/blog-comments/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const comment = await BlogComment.findByIdAndDelete(id);
        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        const body = await _req.json();
        const { blogSlug } = body;

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', `/blog/${blogSlug}`] }),
        });

        return NextResponse.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        console.error('[DELETE /api/admin/blog-comments/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}