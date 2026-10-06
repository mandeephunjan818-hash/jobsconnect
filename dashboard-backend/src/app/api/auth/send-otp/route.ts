import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

const OTP_TTL = 10 * 60; // 10 minutes in seconds

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return uncachedJsonResponse({ error: 'Unauthorized' }, 401);
  }

  const body = await req.json();
  const { type } = body;

  if (!type || !['view', 'change'].includes(type)) {
    return uncachedJsonResponse({ error: 'Invalid type. Must be "view" or "change".' }, 400);
  }

  const rateLimitKey = `account-otp:rate:${session.user.id}:${type}`;
  const rateLimitHit = await redis.get(rateLimitKey);
  if (rateLimitHit) {
    return uncachedJsonResponse(
      { error: 'Please wait 60 seconds before requesting another code.' },
      429
    );
  }

  await connectToDatabase();

  const account = await Account.findOne({
    userId: session.user.id,
    provider: 'credentials',
  }).select('+password');

  if (!account) {
    return uncachedJsonResponse(
      { error: 'No credentials account found. This account uses social login only.', noPassword: true },
      400
    );
  }

  if (!account.password) {
    return uncachedJsonResponse(
      { error: 'No password set for this account.', noPassword: true },
      400
    );
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100_000, 999_999).toString();

  // Store SHA-256 hash of OTP in Redis (never store plaintext)
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  const redisKey = `otp:${session.user.id}:${type}`;
  await redis.set(redisKey, hashedOtp, { ex: OTP_TTL });
  await redis.set(rateLimitKey, '1', { ex: 60 });

  // Fetch user's email and name for the email
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return uncachedJsonResponse({ error: 'User not found' }, 404);
  }

  const emailSent = await sendOTPEmail(
    user.email,
    otp,
    session.user.name || 'User'
  );

  if (!emailSent) {
    // Clean up redis key if email failed
    await redis.del(redisKey);
    await redis.del(rateLimitKey);
    return uncachedJsonResponse({ error: 'Failed to send OTP email. Please try again.' }, 500);
  }

  return uncachedJsonResponse({ success: true, message: 'OTP sent to your email. It expires in 10 minutes.' });
}