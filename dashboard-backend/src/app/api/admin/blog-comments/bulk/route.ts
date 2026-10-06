import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogComment from '@/modal/BlogComment';

// POST /api/admin/blog-comments/bulk
// body: { action: 'delete' | 'approve' | 'unapprove', ids: string[] }
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { blogSlug, action, ids } = await req.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        let count = 0;

        switch (action) {
            case 'delete': {
                const result = await BlogComment.deleteMany({ _id: { $in: ids } });
                count = result.deletedCount ?? 0;
                break;
            }
            case 'approve': {
                const result = await BlogComment.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isApproved: true } }
                );
                count = result.modifiedCount ?? 0;
                break;
            }
            case 'unapprove': {
                const result = await BlogComment.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isApproved: false } }
                );
                count = result.modifiedCount ?? 0;
                break;
            }
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', `/blog/${blogSlug}`] }),
        });

        return NextResponse.json({
            message: `Bulk ${action} completed`,
            modifiedCount: count,
        });
    } catch (err) {
        console.error('[BULK /api/admin/blog-comments]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}