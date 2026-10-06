import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { SubscriptionUsageEvent } from '@/modal/SubscriptionUsageEvent';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.min(50, parseInt(sp.get('perPage') ?? '20', 10));
    const skip = (page - 1) * perPage;

    await connectToDatabase();

    const [events, total] = await Promise.all([
        SubscriptionUsageEvent.find({
            userId: new mongoose.Types.ObjectId(token.id),
        })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(perPage)
            .lean(),
        SubscriptionUsageEvent.countDocuments({
            userId: new mongoose.Types.ObjectId(token.id),
        }),
    ]);

    return NextResponse.json({
        events,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
    });
}