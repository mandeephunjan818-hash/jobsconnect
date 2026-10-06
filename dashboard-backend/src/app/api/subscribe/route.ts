// ─────────────────────────────────────────────────────────────────────────────
// app/api/subscribe/route.ts  (Public)
// POST /api/subscribe  – subscribe a user
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';
import {
    sendSubscriberWelcomeEmail,
    sendSubscriberAdminNotificationEmail,
} from '@/utils/subscribeEmail';
import { KNOWN_SITES, SiteId } from '@/lib/sites';

export interface SubscribeRequest {
    email: string;
    name?: string;
    siteId: SiteId;
    preferences?: {
        blogs?: boolean;
        jobs?: boolean;
    };
}

export interface SubscribeApiResponse {
    success: boolean;
    message: string;
}

export interface SubscribeApiError {
    error: string;
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const body = (await req.json()) as SubscribeRequest;

        // Validation
        if (!body.email) {
            return NextResponse.json(
                { error: 'Email is required' } satisfies SubscribeApiError,
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return NextResponse.json(
                { error: 'Invalid email address' } satisfies SubscribeApiError,
                { status: 400 }
            );
        }

        if (!body.siteId || !(KNOWN_SITES as readonly string[]).includes(body.siteId)) {
            return NextResponse.json(
                { error: 'Invalid or missing siteId' } satisfies SubscribeApiError,
                { status: 400 }
            );
        }

        const email = body.email.toLowerCase().trim();

        // Check for existing subscriber
        const existing = await Subscriber.findOne({ email, siteId: body.siteId });

        if (existing) {
            if (existing.status === 'active') {
                // Already subscribed — return success silently (no email enumeration)
                return NextResponse.json(
                    { success: true, message: 'You are already subscribed!' } satisfies SubscribeApiResponse,
                    { status: 200 }
                );
            }

            // Re-subscribe
            existing.status = 'active';
            existing.name = body.name ?? existing.name;
            existing.preferences = {
                blogs: body.preferences?.blogs ?? true,
                jobs: body.preferences?.jobs ?? true,
            };
            existing.subscribedAt = new Date();
            existing.unsubscribedAt = undefined;
            await existing.save();

            return NextResponse.json(
                { success: true, message: "Welcome back! You've been re-subscribed." } satisfies SubscribeApiResponse,
                { status: 200 }
            );
        }

        // Create new subscriber
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');

        const subscriber = new Subscriber({
            email,
            name: body.name,
            siteId: body.siteId,
            preferences: {
                blogs: body.preferences?.blogs ?? true,
                jobs: body.preferences?.jobs ?? true,
            },
            unsubscribeToken,
        });

        await subscriber.save();

        // Send emails (non-blocking failures)
        const emailResults = await Promise.allSettled([
            sendSubscriberWelcomeEmail(email, body.name, unsubscribeToken),
            sendSubscriberAdminNotificationEmail(email, body.name),
        ]);

        emailResults.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error(`[subscribe/POST] Email ${i === 0 ? 'welcome' : 'admin'} failed:`, r.reason);
            }
        });

        return NextResponse.json(
            { success: true, message: "You've successfully subscribed!" } satisfies SubscribeApiResponse,
            { status: 201 }
        );
    } catch (err) {
        console.error('[POST /api/subscribe]', err);
        return NextResponse.json(
            { error: 'Internal server error' } satisfies SubscribeApiError,
            { status: 500 }
        );
    }
}