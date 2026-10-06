/**
 * Migration: seed subscription plans + backfill existing employer profiles
 *
 * Run once after deploying the SubscriptionPlan model:
 *   npx ts-node src/migrations/seed-plans-backfill-employers.ts
 *
 * Safe to re-run — uses upsert for plans and $setOnInsert for profiles
 * so existing data is never overwritten.
 */

import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongooes';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';
import { UserProfile } from '@/modal/User';

// ── Plan definitions ───────────────────────────────────────────────────────
// Adjust prices, quotas, and Stripe price IDs to match your Stripe dashboard.
// stripePriceId must match the recurring Price ID in Stripe (price_xxx).

const PLANS = [
    {
        key: 'free',
        name: 'Free',
        stripePriceId: null,
        listingQuota: 1,
        featuredSlots: 0,
        price: 0,
        isActive: true,
    },
    {
        key: 'starter',
        name: 'Starter',
        stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null, // e.g. 'price_xxx'
        listingQuota: 5,
        featuredSlots: 1,
        price: 2900,    // £29.00 in pence
        isActive: true,
    },
    {
        key: 'pro',
        name: 'Pro',
        stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
        listingQuota: 20,
        featuredSlots: 5,
        price: 7900,    // £79.00 in pence
        isActive: true,
    },
];

async function run() {
    await connectToDatabase();
    console.log('Connected to database.');

    // ── 1. Upsert plans ────────────────────────────────────────────────────
    for (const plan of PLANS) {
        const result = await SubscriptionPlan.findOneAndUpdate(
            { key: plan.key },
            { $setOnInsert: plan },  // only writes if no doc exists with this key
            { upsert: true, new: true }
        );
        console.log(`Plan "${plan.key}": ${result?._id ? 'ensured' : 'already existed'}`);
    }

    // ── 2. Backfill existing employer profiles ─────────────────────────────
    // Any UserProfile that doesn't yet have a subscription object gets the
    // free plan defaults. $setOnInsert isn't available for field-level upserts,
    // so we use $set with $exists: false to only write to profiles that lack it.

    const result = await UserProfile.updateMany(
        {
            $or: [
                { 'subscription.planKey': { $exists: false } },
                { subscription: { $exists: false } },
            ],
        },
        {
            $set: {
                subscription: {
                    planKey: 'free',
                    status: 'active',
                    stripeCustomerId: null,
                    stripeSubscriptionId: null,
                    currentPeriodEnd: null,
                    listingQuota: 1,
                    featuredSlots: 0,
                },
            },
        }
    );

    console.log(`Backfilled ${result.modifiedCount} UserProfile(s) to free plan.`);

    await mongoose.disconnect();
    console.log('Done.');
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});