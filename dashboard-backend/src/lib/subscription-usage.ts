/**
 * lib/subscription-usage.ts
 *
 * CHANGES FROM ORIGINAL:
 *
 * 1. Added `incrementUsageWithLimitCheck()` — an ATOMIC check-and-increment
 *    using a single findOneAndUpdate with a Mongo query-level guard
 *    (`$lt: limit` in the filter), eliminating the TOCTOU race where two
 *    concurrent requests could both pass a separate "read then compare"
 *    check and both succeed, blowing past the quota.
 *
 *    The old `incrementUsage()` is kept (renamed usage internally is the
 *    same signature) for call sites that don't need limit enforcement
 *    (e.g. applicant counting, which has no hard cap today), but it now
 *    THROWS instead of silently no-op'ing when the profile is missing,
 *    so callers can decide whether that's fatal or log-and-continue.
 *
 * 2. Period resolution now goes through lib/billing-period.ts exclusively.
 *
 * 3. incrementUsage / incrementUsageWithLimitCheck now also update
 *    `planKey` on every write (not just $setOnInsert), so a usage doc
 *    created before a plan upgrade reflects the new plan key going forward
 *    without waiting for the webhook to touch it directly.
 *
 * 4. Added `getEffectiveLimit()` — resolves a resource's TRUE limit as
 *    base plan limit + any still-valid carried-over `extras` from a recent
 *    plan switch (see modal/User.ts ISubscription.extras). This is now the
 *    ONLY correct way to read a limit for enforcement purposes; reading
 *    `subscription.<field>` directly ignores extras and will under-grant
 *    quota to users who just switched plans with leftover allowance.
 *    `incrementUsageWithLimitCheck` and `getCurrentUsage` callers should
 *    pass the result of getEffectiveLimit() as the `limit` argument rather
 *    than the raw plan field.
 */

import connectToDatabase from '@/lib/mongooes';
import { UserProfile, ISubscription, ISubscriptionExtras } from '@/modal/User';
import { SubscriptionUsage } from '@/modal/SubscriptionUsage';
import { SubscriptionUsageEvent, ResourceType } from '@/modal/SubscriptionUsageEvent';
import { resolveBillingPeriod, periodQuery } from '@/lib/billing-period';
import mongoose from 'mongoose';

const USAGE_FIELD: Record<ResourceType, string> = {
    listing: 'manualPostsUsed',
    manual_post: 'manualPostsUsed',
    auto_post: 'autoPostsUsed',
    job_bank_request: 'jobBankRequestsUsed',
    applicant: 'applicantsUsed',
};

// Maps a ResourceType to the matching field name on both
// ISubscription (base limit) and ISubscriptionExtras (carried-over extra).
// These happen to share field names with the plan-limit fields today
// (listingQuota, applicantLimit, manualPostLimit, autoPostLimit,
// jobBankRequestLimit) — NOT the same as USAGE_FIELD, which names the
// *usage counter* field on SubscriptionUsage.
const LIMIT_FIELD: Record<ResourceType, keyof ISubscriptionExtras> = {
    listing: 'listingQuota',
    manual_post: 'manualPostLimit',
    auto_post: 'autoPostLimit',
    job_bank_request: 'jobBankRequestLimit',
    applicant: 'applicantLimit',
};

export class ProfileNotFoundError extends Error {
    constructor(userId: string) {
        super(`UserProfile not found for userId=${userId}`);
        this.name = 'ProfileNotFoundError';
    }
}

export class QuotaExceededError extends Error {
    constructor(public resourceType: ResourceType, public limit: number) {
        super(`Quota exceeded for ${resourceType} (limit: ${limit})`);
        this.name = 'QuotaExceededError';
    }
}

/**
 * Resolve the EFFECTIVE limit for a resource type: base plan limit plus any
 * still-valid carried-over `extras` from a recent plan switch.
 *
 * Extras are only applied while `Date.now() <= subscription.extrasExpiresAt`.
 * Expired extras are treated as 0 here but are NOT actively cleared from the
 * document — that's a lazy-expiry read, intentionally, to avoid needing a
 * background job. (A cron/webhook could clear them on period rollover, but
 * is not required for correctness since this function always re-checks the
 * expiry timestamp.)
 *
 * `limit <= 0` on the BASE plan field still means "unlimited" per the
 * existing codebase convention — extras are not added on top of unlimited
 * (there's nothing to add to), and this function returns 0 to preserve that
 * meaning for callers that branch on `limit > 0`.
 */
export function getEffectiveLimit(
    subscription: Partial<ISubscription> | undefined | null,
    resourceType: ResourceType
): number {
    if (!subscription) return 0;

    const field = LIMIT_FIELD[resourceType];
    const baseLimit = (subscription as any)[field] ?? 0;

    // Unlimited stays unlimited; extras are meaningless on top of "no cap".
    if (baseLimit <= 0) return baseLimit;

    const extrasExpiresAt = subscription.extrasExpiresAt
        ? new Date(subscription.extrasExpiresAt)
        : null;
    const extrasActive = extrasExpiresAt !== null && extrasExpiresAt.getTime() > Date.now();

    if (!extrasActive || !subscription.extras) return baseLimit;

    const extraAmount = subscription.extras[field] ?? 0;
    return baseLimit + Math.max(0, extraAmount);
}

/**
 * Increment usage with NO limit enforcement (e.g. applicant counting,
 * which today has no hard cap). Throws ProfileNotFoundError instead of
 * silently returning, so fire-and-forget callers can choose to log loudly.
 */
export async function incrementUsage(
    userId: string,
    resourceType: ResourceType,
    increment = 1,
    metadata?: Record<string, any>
): Promise<void> {
    await connectToDatabase();

    const profile = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    if (!profile) throw new ProfileNotFoundError(userId);

    const planKey = profile.subscription?.planKey ?? 'free';
    const period = resolveBillingPeriod(profile.subscription);
    const field = USAGE_FIELD[resourceType];

    await SubscriptionUsage.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), ...periodQuery(period) },
        {
            $setOnInsert: { periodStart: period.periodStart, periodEnd: period.periodEnd },
            $set: { planKey },
            $inc: { [field]: increment },
        },
        { upsert: true, new: true }
    );

    await SubscriptionUsageEvent.create({
        userId: new mongoose.Types.ObjectId(userId),
        resourceType,
        change: increment,
        metadata,
        timestamp: new Date(),
    });
}

/**
 * Atomically check-and-increment a quota-limited resource.
 *
 * Uses a single findOneAndUpdate where the FILTER itself includes the
 * limit check (`[field]: { $lt: limit }`), so the increment only applies
 * if the document still has headroom at the moment Mongo evaluates the
 * filter — this is atomic per-document and closes the race condition that
 * existed in the old "read usage, compare, then create+increment" pattern.
 *
 * IMPORTANT: `limit` here must be the EFFECTIVE limit (base + extras) —
 * callers should compute it via getEffectiveLimit() before calling this,
 * not pass the raw subscription field. This function does not look up
 * extras itself because it doesn't have a resourceType -> extras mapping
 * guarantee at the call site level for every caller; keeping limit as an
 * explicit parameter keeps this function's contract simple and testable.
 *
 * Returns the new usage count on success.
 * Throws QuotaExceededError if the limit is already reached (limit > 0).
 * Throws ProfileNotFoundError if no profile exists.
 *
 * NOTE: limit === 0 is treated as "no plan-defined limit" (matches the
 * existing convention in the codebase, e.g. `manualPostLimit > 0` checks)
 * and is NOT enforced — pass a real limit if you want a hard cap at zero
 * usage allowed.
 */
export async function incrementUsageWithLimitCheck(
    userId: string,
    resourceType: ResourceType,
    limit: number,
    increment = 1,
    metadata?: Record<string, any>
): Promise<{ used: number; limit: number }> {
    await connectToDatabase();

    const profile = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    if (!profile) throw new ProfileNotFoundError(userId);

    const planKey = profile.subscription?.planKey ?? 'free';
    const period = resolveBillingPeriod(profile.subscription);
    const field = USAGE_FIELD[resourceType];
    const baseFilter = { userId: new mongoose.Types.ObjectId(userId), ...periodQuery(period) };

    // Step 1: try to atomically increment an EXISTING doc that still has headroom.
    // The $lt guard is what makes this race-safe: Mongo evaluates the filter
    // (including the headroom check) and applies the update atomically per document.
    if (limit > 0) {
        const updated = await SubscriptionUsage.findOneAndUpdate(
            { ...baseFilter, [field]: { $lt: limit } },
            { $set: { planKey }, $inc: { [field]: increment } },
            { new: true }
        ).lean();

        if (updated) {
            await SubscriptionUsageEvent.create({
                userId: new mongoose.Types.ObjectId(userId),
                resourceType,
                change: increment,
                metadata,
                timestamp: new Date(),
            });
            return { used: (updated as any)[field], limit };
        }

        // No doc matched the headroom filter. Either:
        //  (a) no usage doc exists yet for this period → safe to create at 0+increment, or
        //  (b) a doc exists but is already at/over the limit → must reject.
        const existing = await SubscriptionUsage.findOne(baseFilter).lean();
        if (existing) {
            throw new QuotaExceededError(resourceType, limit);
        }

        try {
            const created = await SubscriptionUsage.findOneAndUpdate(
                baseFilter,
                {
                    $setOnInsert: { periodStart: period.periodStart, periodEnd: period.periodEnd, planKey },
                    $inc: { [field]: increment },
                },
                { upsert: true, new: true }
            ).lean();

            await SubscriptionUsageEvent.create({
                userId: new mongoose.Types.ObjectId(userId),
                resourceType,
                change: increment,
                metadata,
                timestamp: new Date(),
            });
            return { used: (created as any)[field], limit };
        } catch (err: any) {
            // Duplicate key = someone else created the doc in the gap above.
            // Retry once via the atomic $lt path now that the doc exists.
            if (err?.code === 11000) {
                const retried = await SubscriptionUsage.findOneAndUpdate(
                    { ...baseFilter, [field]: { $lt: limit } },
                    { $set: { planKey }, $inc: { [field]: increment } },
                    { new: true }
                ).lean();
                if (!retried) throw new QuotaExceededError(resourceType, limit);
                await SubscriptionUsageEvent.create({
                    userId: new mongoose.Types.ObjectId(userId),
                    resourceType,
                    change: increment,
                    metadata,
                    timestamp: new Date(),
                });
                return { used: (retried as any)[field], limit };
            }
            throw err;
        }
    }

    // limit <= 0 means "unlimited" per existing codebase convention — just increment.
    await incrementUsage(userId, resourceType, increment, metadata);
    const doc = await SubscriptionUsage.findOne(baseFilter).lean();
    return { used: (doc as any)?.[field] ?? increment, limit };
}

/**
 * Read-only usage fetch for the dashboard, using the SAME period resolution
 * as the write path so the numbers always match what incrementUsage wrote.
 */
export async function getCurrentUsage(userId: string) {
    await connectToDatabase();
    const profile = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    if (!profile) return null;

    const period = resolveBillingPeriod(profile.subscription);
    const usage = await SubscriptionUsage.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        ...periodQuery(period),
    }).lean();

    return {
        listingsUsed: usage?.listingsUsed ?? 0,
        manualPostsUsed: usage?.manualPostsUsed ?? 0,
        autoPostsUsed: usage?.autoPostsUsed ?? 0,
        jobBankRequestsUsed: usage?.jobBankRequestsUsed ?? 0,
        applicantsUsed: usage?.applicantsUsed ?? 0,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
    };
}