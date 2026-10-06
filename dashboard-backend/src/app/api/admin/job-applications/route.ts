import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import JobApplication from '@/modal/JobApplication';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '20');
        const search = searchParams.get('search') || '';
        const siteId = searchParams.get('siteId') || '';
        const dateFrom = searchParams.get('dateFrom') || '';
        const dateTo = searchParams.get('dateTo') || '';
        const status = searchParams.get('status') || '';

        const filter: any = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        if (siteId) filter.siteId = siteId;
        if (status) filter.status = status;
        if (dateFrom || dateTo) {
            filter.appliedAt = {};
            if (dateFrom) filter.appliedAt.$gte = new Date(dateFrom);
            if (dateTo) filter.appliedAt.$lte = new Date(dateTo);
        }

        const total = await JobApplication.countDocuments(filter);
        const applications = await JobApplication.find(filter)
            .sort({ appliedAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .lean();

        return NextResponse.json({
            data: applications,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        console.error('[GET /api/admin/job-applications]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}