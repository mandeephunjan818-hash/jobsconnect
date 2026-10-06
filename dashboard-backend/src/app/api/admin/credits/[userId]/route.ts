/**
 * app/api/admin/credits/[userId]/route.ts
 *
 * GET — wallet summary + all batches for one employer (admin view).
 *       Runs sweepExpiredBatches inline so the admin always sees
 *       a fully up-to-date picture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditWallet } from '@/modal/CreditWallet';
import { UserProfile, User } from '@/modal/User';
import { sweepExpiredBatches, recomputeTotal } from '@/lib/credits';
import mongoose from 'mongoose';

async function isAdmin(sessionUserId: string): Promise<boolean> {
    const profile = await UserProfile
        .findOne({ userId: sessionUserId })
        .select('role')
        .lean();
    return !!profile && ['admin', 'sub-admin'].includes(profile.role);
}

export async function GET(
    _req: NextRequest,
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

    const oid = new mongoose.Types.ObjectId(userId);

    const wallet = await CreditWallet.findOne({ userId: oid });
    if (!wallet) {
        return NextResponse.json({ error: 'No wallet found for this user' }, { status: 404 });
    }

    // Always sweep before returning so the admin sees live state
    await sweepExpiredBatches(wallet);

    const [profile, user] = await Promise.all([
        UserProfile.findOne({ userId: oid }).select('name').lean(),
        User.findById(oid).select('email').lean(),
    ]);

    return NextResponse.json({
        user: {
            userId,
            userName: profile?.name ?? 'Unknown',
            userEmail: (user as any)?.email ?? '',
            stripeCustomerId: wallet.stripeCustomerId,
        },
        wallet: {
            totalAvailable: recomputeTotal(wallet.batches),
            totalPurchased: wallet.totalPurchased,
            totalSpent: wallet.totalSpent,
            totalExpired: wallet.totalExpired,
            // Return ALL batches so the admin can see exhausted/expired ones too
            batches: wallet.batches.map(b => ({
                batchId: b.batchId,
                bundleKey: b.bundleKey,
                bundleName: b.bundleName,
                creditsPurchased: b.creditsPurchased,
                creditsRemaining: b.creditsRemaining,
                listingsPerCredit: b.listingsPerCredit,
                purchasedAt: b.purchasedAt,
                expiresAt: b.expiresAt,
                status: b.status,
                amountPaid: b.amountPaid,
                currency: b.currency,
            })),
        },
    });
}