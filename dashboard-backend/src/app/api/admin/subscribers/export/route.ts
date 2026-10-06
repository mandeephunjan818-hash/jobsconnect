// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin/subscribers/export/route.ts  (Admin)
// GET /api/admin/subscribers/export  – download all (filtered) subscribers as CSV
// Supports same query params as the list endpoint
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';

function escapeCSV(value: string | undefined | null): string {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const search = sp.get('search') || '';
        const status = sp.get('status') || undefined;
        const dateFrom = sp.get('dateFrom') ? new Date(sp.get('dateFrom')!) : undefined;
        const dateTo = sp.get('dateTo') ? new Date(sp.get('dateTo')!) : undefined;
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

        const subscribers = await Subscriber.find(query)
            .sort({ subscribedAt: -1 })
            .lean();

        const header = ['Email', 'Name', 'Site', 'Status', 'Blogs', 'Jobs', 'Subscribed At', 'Unsubscribed At'];
        const rows = subscribers.map((s: any) => [
            escapeCSV(s.email),
            escapeCSV(s.name),
            escapeCSV(s.status),
            escapeCSV(s.siteId),
            s.preferences?.blogs ? 'Yes' : 'No',
            s.preferences?.jobs ? 'Yes' : 'No',
            escapeCSV(s.subscribedAt?.toISOString()),
            escapeCSV(s.unsubscribedAt?.toISOString()),
        ]);

        const csv = [header, ...rows].map((r) => r.join(',')).join('\n');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="subscribers-${Date.now()}.csv"`,
            },
        });
    } catch (err) {
        console.error('[GET /api/admin/subscribers/export]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}