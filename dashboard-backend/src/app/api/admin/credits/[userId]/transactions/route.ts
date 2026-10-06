/**
 * app/api/admin/credits/[userId]/transactions/route.ts
 *
 * GET — paginated CreditTransaction history for one user.
 *       Admin-only. Supports eventType filter.
 *
 * Query params:
 *   page        default 1
 *   limit       default 20, max 50
 *   eventType   purchase | spend | expired | refund | adjustment  (omit = all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditTransaction } from '@/modal/CreditTransaction';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

const VALID_EVENT_TYPES = ['purchase', 'spend', 'expired', 'refund', 'adjustment'] as const;

async function isAdmin(sessionUserId: string): Promise<boolean> {
    const profile = await UserProfile
        .findOne({ userId: sessionUserId })
        .select('role')
        .lean();
    return !!profile && ['admin', 'sub-admin'].includes(profile.role);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    if (!(await isAdmin((session.user as any).id))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const eventType = searchParams.get('eventType') as typeof VALID_EVENT_TYPES[number] | null;

    const filter: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(userId),
    };
    if (eventType && VALID_EVENT_TYPES.includes(eventType)) {
        filter.eventType = eventType;
    }

    const [transactions, total] = await Promise.all([
        CreditTransaction.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
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