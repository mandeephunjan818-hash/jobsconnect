/**
 * app/api/admin/credits/[userId]/adjust/route.ts
 *
 * POST — admin manual credit grant or deduction.
 *        Wraps lib/credits.ts adjustCredits() with an admin guard.
 *        The Stripe mirror + MongoDB audit log are both handled
 *        inside adjustCredits — nothing extra needed here.
 *
 * Body: { creditDelta: number, reason: string }
 *   creditDelta  positive = grant, negative = deduct
 *   reason       required — recorded in CreditTransaction.adjustmentReason
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { adjustCredits } from '@/lib/credits';
import { CreditWallet } from '@/modal/CreditWallet';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

async function isAdmin(sessionUserId: string): Promise<boolean> {
    const profile = await UserProfile
        .findOne({ userId: sessionUserId })
        .select('role')
        .lean();
    return !!profile && ['admin', 'sub-admin'].includes(profile.role);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const adminUserId = (session.user as any).id;

    if (!(await isAdmin(adminUserId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    let body: { creditDelta?: unknown; reason?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { creditDelta, reason } = body;

    if (typeof creditDelta !== 'number' || !isFinite(creditDelta) || creditDelta === 0) {
        return NextResponse.json({ error: 'creditDelta must be a non-zero finite number' }, { status: 400 });
    }
    if (typeof reason !== 'string' || !reason.trim()) {
        return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    // Resolve stripeCustomerId from the wallet — adjustCredits needs it for the Stripe mirror
    const wallet = await CreditWallet
        .findOne({ userId: new mongoose.Types.ObjectId(userId) })
        .select('stripeCustomerId')
        .lean();

    if (!wallet) {
        return NextResponse.json({ error: 'No credit wallet found for this user' }, { status: 404 });
    }

    const result = await adjustCredits({
        userId,
        stripeCustomerId: wallet.stripeCustomerId,
        creditDelta,
        reason: reason.trim(),
        adminUserId,
    });

    if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 422 });
    }

    return NextResponse.json({
        success: true,
        message: result.message,
        balanceAfter: result.balanceAfter,
    });
}