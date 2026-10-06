// app/api/auth/forgot-password/verify-otp/route.ts
//
// PUBLIC endpoint — no session required.
// Verifies the OTP that was sent to the user's email, then issues
// a short-lived signed JWT "action token" that the reset-password
// endpoint will consume.

import { NextRequest } from 'next/server';
import { uncachedJsonResponse } from '@/lib/cache';
import { Redis } from '@upstash/redis';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const ACTION_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes to complete the reset

// Brute-force guard: max 5 wrong attempts per email before the OTP is voided
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, otp } = body;

  if (!email || typeof email !== 'string') {
    return uncachedJsonResponse({ error: 'Email is required.' }, 400);
  }
  if (!otp || typeof otp !== 'string') {
    return uncachedJsonResponse({ error: 'OTP is required.' }, 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // --- Brute-force check ---
  const attemptsKey = `forgot-password:attempts:${normalizedEmail}`;
  const attempts = await redis.get<number>(attemptsKey);

  if (attempts !== null && attempts >= MAX_ATTEMPTS) {
    return uncachedJsonResponse(
      {
        error:
          'Too many incorrect attempts. Your OTP has been invalidated. Please request a new one.',
      },
      429
    );
  }

  const redisKey = `forgot-password:otp:${normalizedEmail}`;
  const storedHash = await redis.get<string>(redisKey);

  if (!storedHash) {
    return uncachedJsonResponse(
      { error: 'OTP has expired or was not found. Please request a new one.' },
      400
    );
  }

  const inputHash = crypto
    .createHash('sha256')
    .update(otp.trim())
    .digest('hex');

  if (inputHash !== storedHash) {
    // Increment attempts counter (TTL matches OTP TTL so it auto-expires)
    await redis.incr(attemptsKey);
    // Only set the TTL on first increment so the window is anchored to the
    // first wrong attempt, not extended on each one
    if (!attempts) {
      await redis.expire(attemptsKey, 10 * 60);
    }

    const remaining = MAX_ATTEMPTS - ((attempts ?? 0) + 1);
    return uncachedJsonResponse(
      {
        error: `Invalid OTP. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'No attempts remaining — please request a new OTP.'}`,
      },
      400
    );
  }

  // OTP is correct — delete it immediately to prevent reuse, clear attempts
  await redis.del(redisKey);
  await redis.del(attemptsKey);

  // Issue a short-lived signed action token
  // The reset-password endpoint will verify this before changing the password.
  const actionToken = await new SignJWT({
    email: normalizedEmail,
    action: 'change',
    purpose: 'forgot-password',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACTION_TOKEN_TTL_SECONDS}s`)
    .sign(secret);

  return uncachedJsonResponse({ success: true, actionToken });
}