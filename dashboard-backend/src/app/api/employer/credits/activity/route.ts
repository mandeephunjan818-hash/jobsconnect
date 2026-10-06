/**
 * app/api/employer/credits/activity/route.ts
 *
 * GET — paginated credit transaction history for the logged-in employer.
 *
 * Query params:
 *   page        default 1
 *   limit       default 20, max 50
 *   eventType   filter: purchase | spend | expired | refund | adjustment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditTransaction } from '@/modal/CreditTransaction';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const eventType = searchParams.get('eventType');
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(session.user.id),
    };

    if (eventType && ['purchase', 'spend', 'expired', 'refund', 'adjustment'].includes(eventType)) {
        filter.eventType = eventType;
    }

    const [transactions, total] = await Promise.all([
        CreditTransaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        CreditTransaction.countDocuments(filter),
    ]);

    return NextResponse.json({
        transactions,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    });
}