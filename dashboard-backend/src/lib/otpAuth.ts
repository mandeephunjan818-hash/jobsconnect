// lib/otpAuth.ts
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const OTP_TTL_SECONDS = 5 * 60;        // 5 min — shorter than password-reset OTP since this is per-login
const RESEND_COOLDOWN_SECONDS = 60;    // 1 min between sends
const MAX_ATTEMPTS = 5;                // wrong-guess lockout
const MAX_SENDS_PER_DAY = 10;          // abuse cap per email per 24h

export function normalizeEmail(email: string) {
    return email.toLowerCase().trim();
}

export function hashOtp(otp: string) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

/** Timing-safe compare to avoid leaking match-length via response time */
export function safeCompareHash(a: string, b: string) {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export async function issueOtp(purpose: 'register' | 'login', email: string) {
    const key = normalizeEmail(email);
    const cooldownKey = `otp:${purpose}:cooldown:${key}`;
    const dailyKey = `otp:${purpose}:daily:${key}`;

    if (await redis.get(cooldownKey)) {
        return { ok: false as const, status: 429, error: 'Please wait 60 seconds before requesting another code.' };
    }

    const dailyCount = (await redis.get<number>(dailyKey)) ?? 0;
    if (dailyCount >= MAX_SENDS_PER_DAY) {
        return { ok: false as const, status: 429, error: 'Too many codes requested today. Try again tomorrow.' };
    }

    const otp = crypto.randomInt(100_000, 999_999).toString();
    const otpKey = `otp:${purpose}:code:${key}`;
    const attemptsKey = `otp:${purpose}:attempts:${key}`;

    await redis.set(otpKey, hashOtp(otp), { ex: OTP_TTL_SECONDS });
    await redis.set(cooldownKey, '1', { ex: RESEND_COOLDOWN_SECONDS });
    await redis.del(attemptsKey); // fresh attempt counter on every new code
    await redis.set(dailyKey, dailyCount + 1, { ex: 24 * 60 * 60 });

    return { ok: true as const, otp };
}

export async function verifyOtp(purpose: 'register' | 'login', email: string, submitted: string) {
    const key = normalizeEmail(email);
    const otpKey = `otp:${purpose}:code:${key}`;
    const attemptsKey = `otp:${purpose}:attempts:${key}`;

    const attempts = (await redis.get<number>(attemptsKey)) ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
        return { ok: false as const, error: 'Too many incorrect attempts. Please request a new code.' };
    }

    const storedHash = await redis.get<string>(otpKey);
    if (!storedHash) {
        return { ok: false as const, error: 'Code has expired or was not found. Please request a new one.' };
    }

    if (!submitted || !safeCompareHash(hashOtp(submitted.trim()), storedHash)) {
        await redis.set(attemptsKey, attempts + 1, { ex: OTP_TTL_SECONDS });
        return { ok: false as const, error: 'Invalid code. Please try again.' };
    }

    // success — burn the code so it can't be replayed
    await redis.del(otpKey);
    await redis.del(attemptsKey);
    return { ok: true as const };
}