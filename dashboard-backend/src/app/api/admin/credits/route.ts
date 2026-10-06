/**
 * app/api/admin/credits/route.ts
 *
 * GET — paginated list of all CreditWallet documents enriched with
 *        user name + email from UserProfile/User.
 *
 * Query params:
 *   page       default 1
 *   perPage    default 15, max 100
 *   sortBy     totalAvailable | totalPurchased | totalSpent | totalExpired | updatedAt | lastPurchaseAt | userName
 *   sortOrder  asc | desc
 *   search     matches userEmail or userName (case-insensitive)
 *   minCredits number — filter wallets with totalAvailable ≥ this
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditWallet } from '@/modal/CreditWallet';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

const ALLOWED_SORT = new Set([
    'totalAvailable', 'totalPurchased', 'totalSpent', 'totalExpired',
    'updatedAt', 'createdAt', 'lastPurchaseAt', 'userName',
]);

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Admin guard ───────────────────────────────────────────
    const profile = await (await connectToDatabase(),
        UserProfile.findOne({ userId: (session.user as any).id }).select('role').lean());
    if (!profile || !['admin', 'sub-admin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') ?? '15', 10)));
    const sortByRaw = searchParams.get('sortBy') ?? 'updatedAt';
    const sortBy = ALLOWED_SORT.has(sortByRaw) ? sortByRaw : 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search')?.trim() ?? '';
    const minCreditsRaw = searchParams.get('minCredits');
    const minCredits = minCreditsRaw != null ? parseInt(minCreditsRaw, 10) : null;

    // ── Build wallet-level filter ─────────────────────────────
    const walletFilter: Record<string, unknown> = {};
    if (minCredits != null && !isNaN(minCredits)) {
        walletFilter.totalAvailable = { $gte: minCredits };
    }

    // ── Aggregate: join with UserProfile for name/email ───────
    // We denormalise at query time rather than storing user info
    // on the wallet (to avoid drift if user updates their email).

    const pipeline: mongoose.PipelineStage[] = [
        { $match: walletFilter },

        // Join UserProfile
        {
            $lookup: {
                from: 'userprofiles',
                localField: 'userId',
                foreignField: 'userId',
                as: 'profile',
            },
        },
        { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },

        // Join User (for email)
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

        // Add derived fields
        {
            $addFields: {
                userName: { $ifNull: ['$profile.name', 'Unknown'] },
                userEmail: { $ifNull: ['$user.email', ''] },
                activeBatchCount: {
                    $size: {
                        $filter: {
                            input: { $ifNull: ['$batches', []] },
                            as: 'b',
                            cond: {
                                $and: [
                                    { $eq: ['$$b.status', 'active'] },
                                    { $gt: ['$$b.creditsRemaining', 0] },
                                    { $gt: ['$$b.expiresAt', new Date()] },
                                ],
                            },
                        },
                    },
                },
                lastPurchaseAt: {
                    $let: {
                        vars: {
                            purchasedBatches: {
                                $sortArray: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ['$batches', []] },
                                            as: 'b',
                                            cond: { $ifNull: ['$$b.purchasedAt', false] },
                                        },
                                    },
                                    sortBy: { purchasedAt: -1 },
                                },
                            },
                        },
                        in: { $ifNull: [{ $first: '$$purchasedBatches.purchasedAt' }, null] },
                    },
                },
            },
        },
    ];

    // ── Search filter (post-join) ─────────────────────────────
    if (search) {
        const regex = new RegExp(search, 'i');
        pipeline.push({
            $match: {
                $or: [
                    { userName: { $regex: search, $options: 'i' } },
                    { userEmail: { $regex: search, $options: 'i' } },
                ],
            },
        });
    }

    // ── Total count (before pagination) ──────────────────────
    const countPipeline: mongoose.PipelineStage[] = [
        ...pipeline,
        { $count: 'total' },
    ];
    const countResult = await CreditWallet.aggregate(countPipeline);
    const total = countResult[0]?.total ?? 0;

    // ── Sort + paginate ───────────────────────────────────────
    // sortBy 'userName' maps to the computed field
    pipeline.push(
        { $sort: { [sortBy]: sortOrder } },
        { $skip: (page - 1) * perPage },
        { $limit: perPage },
        {
            $project: {
                userId: 1,
                stripeCustomerId: 1,
                userName: 1,
                userEmail: 1,
                totalAvailable: 1,
                totalPurchased: 1,
                totalSpent: 1,
                totalExpired: 1,
                activeBatchCount: 1,
                lastPurchaseAt: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    );

    const wallets = await CreditWallet.aggregate(pipeline);

    return NextResponse.json({
        data: wallets,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
    });
}