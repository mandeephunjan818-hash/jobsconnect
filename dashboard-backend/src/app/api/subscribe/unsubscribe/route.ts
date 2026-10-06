// ─────────────────────────────────────────────────────────────────────────────
// app/api/subscribe/unsubscribe/route.ts  (Public)
// GET /api/subscribe/unsubscribe?token=<token>  – one-click unsubscribe
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const token = req.nextUrl.searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        const subscriber = await Subscriber.findOne({ unsubscribeToken: token });

        if (!subscriber) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
        }

        if (subscriber.status === 'unsubscribed') {
            // Already unsubscribed — redirect to a friendly page
            return NextResponse.redirect(`https://${subscriber.siteId}/unsubscribed?already=true`);
        }

        subscriber.status = 'unsubscribed';
        subscriber.unsubscribedAt = new Date();
        await subscriber.save();

        // Redirect to a confirmation page (create /app/unsubscribed/page.tsx as needed)
        return NextResponse.redirect(`https://${subscriber.siteId}/`);
    } catch (err) {
        console.error('[GET /api/subscribe/unsubscribe]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}