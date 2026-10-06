/**
 * app/api/employer/credits/wallet/route.ts
 *
 * GET — returns the employer's wallet: balance, active batches, near-expiry warning.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditWallet } from '@/modal/CreditWallet';
import { sweepExpiredBatches, recomputeTotal } from '@/lib/credits';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const wallet = await CreditWallet.findOne({ userId });

    if (!wallet) {
        return NextResponse.json({
            totalAvailable: 0,
            batches: [],
            totalPurchased: 0,
            totalSpent: 0,
            totalExpired: 0,
            nearExpiryWarning: null,
        });
    }

    // Sweep expired inline so response is always accurate
    await sweepExpiredBatches(wallet);

    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Active batches only (sorted nearest-expiry-first already)
    const activeBatches = wallet.batches
        .filter((b) => b.status === 'active' && b.expiresAt > now && b.creditsRemaining > 0)
        .map((b) => ({
            batchId: b.batchId,
            bundleKey: b.bundleKey,
            bundleName: b.bundleName,
            creditsRemaining: b.creditsRemaining,
            creditsPurchased: b.creditsPurchased,
            listingsPerCredit: b.listingsPerCredit,
            purchasedAt: b.purchasedAt,
            expiresAt: b.expiresAt,
            amountPaid: b.amountPaid,
            currency: b.currency,
            isNearExpiry: b.expiresAt <= soon,
        }));

    // Near expiry warning — credits that will expire within 30 days
    const nearExpiryCredits = activeBatches
        .filter((b) => b.isNearExpiry)
        .reduce((sum, b) => sum + b.creditsRemaining, 0);

    const earliestExpiry = activeBatches[0]?.expiresAt ?? null;

    return NextResponse.json({
        totalAvailable: recomputeTotal(wallet.batches),
        batches: activeBatches,
        totalPurchased: wallet.totalPurchased,
        totalSpent: wallet.totalSpent,
        totalExpired: wallet.totalExpired,
        nearExpiryWarning:
            nearExpiryCredits > 0
                ? {
                    credits: nearExpiryCredits,
                    expiresAt: earliestExpiry,
                }
                : null,
    });
}