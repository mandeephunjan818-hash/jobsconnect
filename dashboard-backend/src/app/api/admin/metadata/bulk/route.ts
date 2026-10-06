//api/admin/metadata/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Metadata from '@/modal/Metadata';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { action, ids } = await req.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'No IDs provided' },
                { status: 400 }
            );
        }

        let count = 0;

        switch (action) {
            case 'delete': {
                const result = await Metadata.deleteMany({ _id: { $in: ids } });
                count = result.deletedCount || 0;
                break;
            }
            case 'activate': {
                const result = await Metadata.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isActive: true } }
                );
                count = result.modifiedCount || 0;
                break;
            }
            case 'deactivate': {
                const result = await Metadata.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isActive: false } }
                );
                count = result.modifiedCount || 0;
                break;
            }
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
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
            message: `Bulk ${action} completed`,
            modifiedCount: count,
        });
    } catch (error) {
        console.error('[BULK /apis/admin/metadata]', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}