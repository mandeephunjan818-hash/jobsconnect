import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import JobBankRequest, { KNOWN_SITES } from '@/modal/JobBankRequest';
import {
    toJobBankRequestItem,
    JobBankRequestApiResponse,
} from '@/modal/JobBankRequest.helpers';
import { sendJobBankRequestConfirmationEmail } from '@/utils/email';
import { incrementUsage } from '@/lib/subscription-usage';
import { UserProfile } from '@/modal/User';
import { SubscriptionUsage } from '@/modal/SubscriptionUsage';
import { getAvailableCredits, spendCredits } from '@/lib/credits';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id;
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const status = sp.get('status') || '';
        const search = sp.get('search') || '';
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

        const query: any = { userId };
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { jobBankId: { $regex: search, $options: 'i' } },
                { userNotes: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * perPage;
        const [docs, total] = await Promise.all([
            JobBankRequest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .lean(),
            JobBankRequest.countDocuments(query),
        ]);

        return NextResponse.json({
            data: docs.map(toJobBankRequestItem),
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        } satisfies JobBankRequestApiResponse);
    } catch (err) {
        console.error('[GET /api/job-bank-requests]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id;
        const userEmail = session.user.email ?? '';
        const userName = session.user.name ?? 'User';

        const body = await req.json();
        const { jobBankId, userNotes, sites } = body;

        if (!jobBankId || !String(jobBankId).trim()) {
            return NextResponse.json({ error: 'jobBankId is required' }, { status: 400 });
        }

        const cleanSites: string[] = [];
        if (sites !== undefined && sites !== null) {
            if (!Array.isArray(sites)) {
                return NextResponse.json({ error: 'sites must be an array of hostname strings.' }, { status: 400 });
            }
            const unknown = (sites as string[]).filter(s => !(KNOWN_SITES as readonly string[]).includes(s));
            if (unknown.length > 0) {
                return NextResponse.json({ error: `Unknown site(s): ${unknown.join(', ')}` }, { status: 400 });
            }
            cleanSites.push(...(sites as string[]));
        }

        const cleanJobBankId = String(jobBankId).trim();

        await connectToDatabase();

        // ── Duplicate check ───────────────────────────────────────────────────
        const existing = await JobBankRequest.findOne({
            userId,
            jobBankId: cleanJobBankId,
            status: { $nin: ['rejected'] },
        });
        if (existing) {
            return NextResponse.json(
                {
                    error: `A request for Job Bank ID "${cleanJobBankId}" already exists with status "${existing.status}".`,
                    existingId: existing._id.toString(),
                    existingStatus: existing.status,
                },
                { status: 409 },
            );
        }

        // ── Load profile ──────────────────────────────────────────────────────
        const profile = await UserProfile.findOne({ userId }).lean();
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        // ── Subscription quota check ──────────────────────────────────────────
        const usage = await SubscriptionUsage.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            periodStart: profile.subscription?.currentPeriodStart ?? new Date(0),
            periodEnd: profile.subscription?.currentPeriodEnd ?? new Date(),
        }).lean();

        const jobBankRequestsUsed = usage?.jobBankRequestsUsed ?? 0;
        const jobBankRequestLimit = 5;

        if (jobBankRequestsUsed >= jobBankRequestLimit) {
            return NextResponse.json(
                { error: 'Job bank request limit reached. Please upgrade your plan.' },
                { status: 429 }
            );
        }

        // ── Credit balance check ──────────────────────────────────────────────
        const stripeCustomerId = profile.subscription?.stripeCustomerId;
        if (!stripeCustomerId) {
            return NextResponse.json(
                {
                    error: 'No billing account found. Please complete your account setup before submitting a job bank request.',
                    code: 'NO_STRIPE_CUSTOMER',
                },
                { status: 402 }
            );
        }

        const CREDITS_PER_REQUEST = 1;

        const availableCredits = await getAvailableCredits(userId);
        if (availableCredits < CREDITS_PER_REQUEST) {
            return NextResponse.json(
                {
                    error: 'Insufficient credits to submit a job bank request.',
                    code: 'INSUFFICIENT_CREDITS',
                    availableCredits,
                    creditsRequired: CREDITS_PER_REQUEST,
                    buyCreditsUrl: '/dashboard/credits',
                },
                { status: 402 }
            );
        }

        // ── Create the request document ───────────────────────────────────────
        // Create first so we have a real ID to attach to the credit transaction.
        // If creation fails, spendCredits is never called — no credits lost.
        const doc = await JobBankRequest.create({
            userId,
            jobBankId: cleanJobBankId,
            userNotes: userNotes?.trim() || undefined,
            sites: cleanSites,
            status: 'pending',
        });

        // ── Deduct credit ─────────────────────────────────────────────────────
        const spendResult = await spendCredits({
            userId,
            stripeCustomerId,
            creditsToSpend: CREDITS_PER_REQUEST,
            listingId: doc._id.toString(),
            listingTitle: `Job Bank Request: ${cleanJobBankId}`,
        });

        if (!spendResult.success) {
            // Race condition — balance dropped between check and spend; roll back
            await JobBankRequest.deleteOne({ _id: doc._id });
            console.warn(
                `[job-bank-requests] Credit spend failed for userId=${userId}: ${spendResult.message}. ` +
                `Request ${doc._id} rolled back.`
            );
            return NextResponse.json(
                {
                    error: spendResult.message,
                    code: 'INSUFFICIENT_CREDITS',
                    availableCredits: spendResult.balanceAfter,
                    creditsRequired: CREDITS_PER_REQUEST,
                    buyCreditsUrl: '/dashboard/credits',
                },
                { status: 402 }
            );
        }

        console.log(
            `[job-bank-requests] userId=${userId} spent ${CREDITS_PER_REQUEST} credit(s) ` +
            `for job bank request ${doc._id} (${cleanJobBankId}). Balance now: ${spendResult.balanceAfter}`
        );

        // ── Track subscription usage ──────────────────────────────────────────
        await incrementUsage(userId, 'job_bank_request', 1, {
            requestId: doc._id.toString(),
            jobBankId: cleanJobBankId,
        });

        // ── Confirmation email ────────────────────────────────────────────────
        if (userEmail) {
            sendJobBankRequestConfirmationEmail(userEmail, userName, cleanJobBankId)
                .catch((err) => console.error('Confirmation email failed:', err));
        }

        return NextResponse.json(
            {
                data: toJobBankRequestItem(doc),
                creditsRemaining: spendResult.balanceAfter,
            },
            { status: 201 }
        );
    } catch (err) {
        console.error('[POST /api/job-bank-requests]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}