// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin/subscribers/[id]/route.ts  (Admin)
// GET    /api/admin/subscribers/:id  – fetch one subscriber
// PATCH  /api/admin/subscribers/:id  – update status or preferences
// DELETE /api/admin/subscribers/:id  – hard delete
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const doc = await Subscriber.findById(id).lean();
        if (!doc) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        return NextResponse.json(
            {
                data: {
                    id: doc._id.toString(),
                    email: doc.email,
                    name: doc.name,
                    siteId: doc.siteId,
                    status: doc.status,
                    preferences: doc.preferences,
                    subscribedAt: doc.subscribedAt.toISOString(),
                    unsubscribedAt: doc.unsubscribedAt?.toISOString(),
                    createdAt: doc.createdAt.toISOString(),
                },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error('[GET /api/admin/subscribers/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const body = await req.json();
        const allowedUpdates: any = {};

        if (body.status && ['active', 'unsubscribed'].includes(body.status)) {
            allowedUpdates.status = body.status;
            if (body.status === 'unsubscribed') {
                allowedUpdates.unsubscribedAt = new Date();
            }
            if (body.status === 'active') {
                allowedUpdates.subscribedAt = new Date();
                allowedUpdates.unsubscribedAt = null;
            }
        }

        if (body.preferences) {
            if (typeof body.preferences.blogs === 'boolean') {
                allowedUpdates['preferences.blogs'] = body.preferences.blogs;
            }
            if (typeof body.preferences.jobs === 'boolean') {
                allowedUpdates['preferences.jobs'] = body.preferences.jobs;
            }
        }

        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updated = await Subscriber.findByIdAndUpdate(
            id,
            { $set: allowedUpdates },
            { new: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error('[PATCH /api/admin/subscribers/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const deleted = await Subscriber.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error('[DELETE /api/admin/subscribers/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}