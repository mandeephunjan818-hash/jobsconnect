// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin/subscribers/stats/route.ts  (Admin)
// GET /api/admin/subscribers/stats  – counts for dashboard header cards
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const siteId = req.nextUrl.searchParams.get('siteId') || undefined;  
        const baseQuery = siteId ? { siteId } : {};

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOf30DaysAgo = new Date(now);
        startOf30DaysAgo.setDate(now.getDate() - 30);

        const [total, active, unsubscribed, newToday, newLast30] = await Promise.all([
            Subscriber.countDocuments(),
            Subscriber.countDocuments({ status: 'active' }),
            Subscriber.countDocuments({ status: 'unsubscribed' }),
            Subscriber.countDocuments({ subscribedAt: { $gte: startOfToday } }),
            Subscriber.countDocuments({ subscribedAt: { $gte: startOf30DaysAgo } }),
        ]);

        return NextResponse.json(
            { total, active, unsubscribed, newToday, newLast30 },
            { status: 200 }
        );
    } catch (err) {
        console.error('[GET /api/admin/subscribers/stats]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}