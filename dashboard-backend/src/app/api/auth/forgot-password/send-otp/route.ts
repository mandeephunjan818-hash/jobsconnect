// app/api/auth/forgot-password/send-otp/route.ts
//
// PUBLIC endpoint — no session required.
// Accepts an email address, looks up the credentials account,
// generates a 6-digit OTP, hashes it into Redis, and emails it.

import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import { User, Account } from '@/modal/User';
import { uncachedJsonResponse } from '@/lib/cache';
import { sendOTPEmail } from '@/utils/otpEmail';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const OTP_TTL = 10 * 60; // 10 minutes
// Prevent hammering: one OTP request per email per 60 seconds
const RATE_LIMIT_TTL = 60;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
        return uncachedJsonResponse({ error: 'Email is required.' }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email shape check — full validation is on the DB schema
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return uncachedJsonResponse({ error: 'Invalid email address.' }, 400);
    }

    // --- Rate limiting ---
    const rateLimitKey = `forgot-password:rate:${normalizedEmail}`;
    const rateLimitHit = await redis.get(rateLimitKey);
    if (rateLimitHit) {
        return uncachedJsonResponse(
            { error: 'Please wait 60 seconds before requesting another OTP.' },
            429
        );
    }

    await connectToDatabase();

    // Look up the user by email
    const user = await User.findOne({ email: normalizedEmail }).lean();

    // IMPORTANT: Always return the same response whether the user exists or not.
    // This prevents email enumeration attacks.
    if (!user) {
        return uncachedJsonResponse({
            success: true,
            message: 'If an account with that email exists, an OTP has been sent.',
        });
    }

    // Ensure they have a credentials account with a password
    const account = await Account.findOne({
        userId: user._id,
        provider: 'credentials',
    }).select('+password');

    if (!account || !account.password) {
        // Social-only account — return the same generic message (no enumeration)
        return uncachedJsonResponse({
            success: true,
            message: 'If an account with that email exists, an OTP has been sent.',
        });
    }

    // Generate OTP and store its hash
    const otp = crypto.randomInt(100_000, 999_999).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const redisKey = `forgot-password:otp:${normalizedEmail}`;
    await redis.set(redisKey, hashedOtp, { ex: OTP_TTL });

    // Set the rate-limit key AFTER writing the OTP so a failed Redis write
    // doesn't lock the user out without them ever getting an email
    await redis.set(rateLimitKey, '1', { ex: RATE_LIMIT_TTL });

    // Send the email (re-use the existing OTP email utility)
    const emailSent = await sendOTPEmail(normalizedEmail, otp, 'User');

    if (!emailSent) {
        // Roll back both keys so the user can try again
        await redis.del(redisKey);
        await redis.del(rateLimitKey);
        return uncachedJsonResponse(
            { error: 'Failed to send OTP email. Please try again.' },
            500
        );
    }

    return uncachedJsonResponse({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.',
    });
}