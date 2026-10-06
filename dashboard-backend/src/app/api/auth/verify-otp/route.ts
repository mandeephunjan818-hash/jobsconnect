import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uncachedJsonResponse } from '@/lib/cache';
import { Redis } from '@upstash/redis';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ACTION_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes
const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return uncachedJsonResponse({ error: 'Unauthorized' }, 401);
  }

  const body = await req.json();
  const { otp, type } = body;

  if (!otp || !type || !['view', 'change'].includes(type)) {
    return uncachedJsonResponse({ error: 'Missing OTP or invalid type.' }, 400);
  }

  const attemptsKey = `account-otp:attempts:${session.user.id}:${type}`;
  const attempts = await redis.get<number>(attemptsKey);
  if (attempts !== null && attempts >= MAX_ATTEMPTS) {
    return uncachedJsonResponse(
      { error: 'Too many incorrect attempts. Your code has been invalidated. Please request a new one.' },
      429
    );
  }

  const redisKey = `otp:${session.user.id}:${type}`;
  const storedHash = await redis.get<string>(redisKey);

  if (!storedHash) {
    return uncachedJsonResponse(
      { error: 'OTP has expired or was not found. Please request a new one.' },
      400
    );
  }

  const inputHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');

  if (inputHash !== storedHash) {
    await redis.incr(attemptsKey);
    if (!attempts) {
      await redis.expire(attemptsKey, 10 * 60);
    }
    const remaining = MAX_ATTEMPTS - ((attempts ?? 0) + 1);
    return uncachedJsonResponse(
      // { error: 'Invalid OTP. Please try again.' }
      { error: `Invalid code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'No attempts remaining — please request a new code.'}` }, 400);
  }

  // OTP is valid — delete immediately to prevent reuse
  await redis.del(redisKey);
  await redis.del(attemptsKey);

  // Issue a short-lived signed action token so the password-change
  // endpoint can verify the user completed OTP verification
  const actionToken = await new SignJWT({
    userId: session.user.id,
    action: type,
    purpose: 'account-settings',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACTION_TOKEN_TTL_SECONDS}s`)
    .sign(secret);

  return uncachedJsonResponse({ success: true, actionToken });
}