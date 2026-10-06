// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin/subscribers/route.ts  (Admin)
// GET  /api/admin/subscribers  – list / filter subscribers
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';
import { SiteId } from '@/lib/sites';

export interface SubscriberItem {
    id: string;
    email: string;
    name?: string;
    siteId: SiteId;
    status: 'active' | 'unsubscribed';
    preferences: { blogs: boolean; jobs: boolean };
    subscribedAt: string;
    unsubscribedAt?: string;
}

export interface SubscribersApiResponse {
    data: SubscriberItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const search = sp.get('search') || '';
        const status = sp.get('status') || undefined;
        const dateFrom = sp.get('dateFrom') ? new Date(sp.get('dateFrom')!) : undefined;
        const dateTo = sp.get('dateTo') ? new Date(sp.get('dateTo')!) : undefined;
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(100, parseInt(sp.get('perPage') ?? '20', 10)));
        const siteId = sp.get('siteId') || undefined;

        const query: any = {};

        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
            ];
        }

        if (status) query.status = status;

        if (dateFrom || dateTo) {
            query.subscribedAt = {};
            if (dateFrom) query.subscribedAt.$gte = dateFrom;
            if (dateTo) query.subscribedAt.$lte = dateTo;
        }

        if (siteId) query.siteId = siteId;

        const skip = (page - 1) * perPage;

        const [subscribers, total] = await Promise.all([
            Subscriber.find(query)
                .sort({ subscribedAt: -1 })
                .skip(skip)
                .limit(perPage)
                .lean(),
            Subscriber.countDocuments(query),
        ]);

        const data: SubscriberItem[] = subscribers.map((doc: any) => ({
            id: doc._id.toString(),
            email: doc.email,
            name: doc.name,
            siteId: doc.siteId,
            status: doc.status,
            preferences: doc.preferences,
            subscribedAt: doc.subscribedAt.toISOString(),
            unsubscribedAt: doc.unsubscribedAt?.toISOString(),
        }));

        return NextResponse.json(
            { data, total, page, perPage, totalPages: Math.ceil(total / perPage) },
            { status: 200 }
        );
    } catch (err) {
        console.error('[GET /api/admin/subscribers]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}