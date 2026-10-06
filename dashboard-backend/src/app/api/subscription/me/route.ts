/**
 * app/api/subscription/me/route.ts
 *
 * CHANGES:
 * - Now returns `extras` and `extrasExpiresAt` (raw, as stored) so the
 *   client can show "why is my limit higher than the plan" context.
 * - Also returns an `effectiveLimits` block: base plan limit + active
 *   extras already summed, using the SAME getEffectiveLimit() helper the
 *   quota-enforcement code path uses (lib/subscription-usage.ts). This
 *   guarantees the dashboard can never show a different number than what
 *   the job-bank-requests (and other quota) routes actually enforce —
 *   there is exactly one place that knows how to combine base + extras,
 *   and both the enforcement path and this display path call it.
 * - extras are only meaningful while not expired; effectiveLimits already
 *   accounts for that (getEffectiveLimit returns base-only past expiry).
 *   The raw `extras` field returned here is NOT pre-filtered by expiry —
 *   it's the stored value as-is, with `extrasExpiresAt` alongside it so
 *   the client can decide how/whether to display a "bonus expires in N
 *   days" hint. Use effectiveLimits for any actual limit math; use
 *   extras + extrasExpiresAt only for explanatory UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import { getEffectiveLimit } from '@/lib/subscription-usage';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({
        userId: new mongoose.Types.ObjectId(token.id),
    }).lean();

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const sub = profile.subscription ?? {};

    const extrasExpiresAt = (sub as any).extrasExpiresAt ?? null;
    const extrasActive = extrasExpiresAt ? new Date(extrasExpiresAt).getTime() > Date.now() : false;

    const rawExtras = (sub as any).extras ?? {
        listingQuota: 0, applicantLimit: 0, manualPostLimit: 0,
        autoPostLimit: 0, jobBankRequestLimit: 0,
    };

    return NextResponse.json({
        subscription: {
            planKey: sub.planKey ?? 'free',
            status: sub.status ?? 'active',
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
            // These two are what the countdown timer needs — must never be omitted
            currentPeriodStart: sub.currentPeriodStart ?? null,
            currentPeriodEnd: sub.currentPeriodEnd ?? null,
            stripeCustomerId: sub.stripeCustomerId ?? null,
            stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
            // Mirror plan limits so UI can show them without a separate plan fetch.
            // These are BASE limits only — for enforcement-accurate numbers,
            // use effectiveLimits below instead.
            listingQuota: sub.listingQuota ?? 1,
            applicantLimit: sub.applicantLimit ?? 0,
            manualPostLimit: sub.manualPostLimit ?? 0,
            autoPostLimit: sub.autoPostLimit ?? 0,
            jobBankRequestLimit: (sub as any).jobBankRequestLimit ?? 5,
            postVisibilityDays: sub.postVisibilityDays ?? 30,

            // ── Carried-over extras from a recent plan switch ────────────
            // Raw stored values + expiry, for explanatory UI only.
            extras: rawExtras,
            extrasExpiresAt,
            extrasActive,

            walletBalance: sub.walletBalance ?? 0,

            // ── Effective limits: base + active extras, already summed ──
            // This is what the dashboard should render as "your limit" —
            // it matches exactly what incrementUsageWithLimitCheck enforces.
            effectiveLimits: {
                listingQuota: getEffectiveLimit(sub, 'listing'),
                applicantLimit: getEffectiveLimit(sub, 'applicant'),
                manualPostLimit: getEffectiveLimit(sub, 'manual_post'),
                autoPostLimit: getEffectiveLimit(sub, 'auto_post'),
                jobBankRequestLimit: getEffectiveLimit(sub, 'job_bank_request'),
            },
        },
    });
}