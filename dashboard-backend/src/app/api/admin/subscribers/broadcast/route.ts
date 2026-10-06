// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin/subscribers/broadcast/route.ts  (Admin)
// POST /api/admin/subscribers/broadcast  – manually broadcast to all active subscribers
//
// This is useful for ad-hoc newsletters. For automatic broadcasts on new blog/job
// creation, call sendBroadcastEmail() directly from your blog/job POST API routes.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';
import { sendBroadcastEmail } from '@/utils/subscribeEmail';
import { KNOWN_SITES, SiteId } from '@/lib/sites';

export interface BroadcastRequest {
    type: 'blog' | 'job';
    title: string;
    url: string;
    /** Optional: only send to subscribers with this preference enabled */
    preference?: 'blogs' | 'jobs';
    siteId?: SiteId;
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const body = (await req.json()) as BroadcastRequest;

        if (!body.type || !body.title || !body.url) {
            return NextResponse.json(
                { error: 'type, title, and url are required' },
                { status: 400 }
            );
        }

        if (!['blog', 'job'].includes(body.type)) {
            return NextResponse.json({ error: 'type must be "blog" or "job"' }, { status: 400 });
        }

        if (body.siteId && !(KNOWN_SITES as readonly string[]).includes(body.siteId)) {
            return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
        }

        // Build query: active subscribers who have the matching preference enabled
        const preferenceKey = body.type === 'blog' ? 'preferences.blogs' : 'preferences.jobs';
        const subscribers = await Subscriber.find({
            status: 'active',
            [preferenceKey]: true,
            ...(body.siteId && { siteId: body.siteId }),
        })
            .select('email name unsubscribeToken')
            .lean();

        if (subscribers.length === 0) {
            return NextResponse.json(
                { success: true, message: 'No active subscribers to notify', sent: 0 },
                { status: 200 }
            );
        }

        await sendBroadcastEmail(
            subscribers.map((s: any) => ({
                email: s.email,
                name: s.name,
                unsubscribeToken: s.unsubscribeToken,
            })),
            body.type,
            body.title,
            body.url
        );

        return NextResponse.json(
            { success: true, message: 'Broadcast sent', sent: subscribers.length },
            { status: 200 }
        );
    } catch (err) {
        console.error('[POST /api/admin/subscribers/broadcast]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}