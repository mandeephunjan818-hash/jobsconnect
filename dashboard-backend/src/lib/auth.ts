/**
 * auth.ts — NextAuth configuration
 *
 * Changes from base version:
 *  1. fetchProfile / touchProfile now also return resolved permissions.
 *  2. JWT callback stores permissions[] in the token.
 *  3. Session callback exposes permissions[] on session.user.
 *  4. JWT module & Session module declarations updated accordingly.
 */

import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { verify } from 'otplib';
import { ROLE_DEFAULT_PERMISSIONS } from '@/config/permissions';
import { verifyOtp, normalizeEmail } from '@/lib/otpAuth';

import { User, Account, UserProfile, LoginHistory, LogoutHistory, resolvePermissions } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import type { Permission } from '@/config/permissions';

import { jwtVerify } from 'jose';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'user' | 'sub-admin' | 'admin';
type OAuthProvider = 'google' | 'github';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: UserRole;
            mfaEnabled: boolean;
            emailVerified: boolean;
            /** Resolved permission strings for this user */
            permissions: Permission[];
            needsOnboarding?: boolean;
            subscription?: {
                planKey: string;
                status: string;
                listingQuota: number;
                featuredSlots: number;
                currentPeriodEnd?: Date;
                cancelAtPeriodEnd?: boolean;      // ← add
                applicantLimit?: number;           // ← add
                manualPostLimit?: number;          // ← add
                autoPostLimit?: number;            // ← add
                postVisibilityDays?: number;       // ← add
                walletBalance?: number;
                extrasActive?: boolean;
                extrasExpiresAt?: string | null;
            };
        };
    }
    interface User {
        id: string;
        role?: UserRole;
        mfaEnabled?: boolean;
        emailVerified?: boolean;
        requiresMFA?: boolean;
        needsOnboarding?: boolean;
    }
}

export interface ISubscription {
    planKey: string;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    listingQuota: number;
    applicantLimit?: number;
    manualPostLimit?: number;
    autoPostLimit?: number;
    postVisibilityDays?: number;
    featuredSlots: number;
    walletBalance?: number;
    extrasActive?: boolean;
    extrasExpiresAt?: string | null;
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        role?: UserRole;
        mfaEnabled?: boolean;
        emailVerified?: boolean;
        requiresMFA?: boolean;
        needsOnboarding?: boolean;
        /** Resolved permission strings for this user */
        permissions?: Permission[];
        isBlocked?: boolean;
        permissionsRefreshedAt?: number;
        subscription?: ISubscription;
    }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ROLES: UserRole[] = ['user', 'sub-admin', 'admin'];
const DEFAULT_ROLE: UserRole = 'user';
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const useSecureCookies = process.env.NODE_ENV === 'production';

const REGISTRATION_TOKEN_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.startsWith('https://')) {
    throw new Error(
        '[auth] NEXTAUTH_URL must be set to an https:// URL in production.'
    );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function toObjectId(id: unknown, context: string): mongoose.Types.ObjectId {
    try {
        const stringId = String(id);
        if (!mongoose.Types.ObjectId.isValid(stringId)) {
            throw new Error(`Invalid ObjectId format: "${stringId}"`);
        }
        return new mongoose.Types.ObjectId(stringId);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`[auth] toObjectId failed in ${context}: ${msg} (received "${id}")`);
    }
}

const normaliseEmail = (email: string): string => email.toLowerCase().trim();

function sanitizeRole(role: unknown, context: string, userId?: string): UserRole {
    const rawRole = String(role || '').toLowerCase().trim();
    if (VALID_ROLES.includes(rawRole as UserRole)) return rawRole as UserRole;
    console.error(
        `[auth] sanitizeRole(${context}): invalid role "${role}" for userId=${userId || 'unknown'}, defaulting to "${DEFAULT_ROLE}"`
    );
    return DEFAULT_ROLE;
}

function extractRequestMeta(req?: unknown): { ip: string; userAgent: string } {
    let ip = 'unknown';
    let userAgent = 'unknown';
    if (req && typeof req === 'object') {
        const headers = (req as Record<string, unknown>).headers as
            Record<string, string | string[]> | undefined;
        if (headers) {
            const forwardedFor = headers['x-forwarded-for'];
            ip = typeof forwardedFor === 'string'
                ? forwardedFor.split(',')[0].trim()
                : Array.isArray(forwardedFor)
                    ? forwardedFor[0].trim()
                    : (headers['x-real-ip'] as string) || 'unknown';
            const ua = headers['user-agent'];
            userAgent = typeof ua === 'string' ? ua : (Array.isArray(ua) ? ua[0] : 'unknown');
        }
    }
    return { ip, userAgent };
}

async function logLogin(params: {
    userId?: string | null;
    provider: RegExp | "credentials" | "google" | "github" | "mfa" | 'otp' | undefined;
    success: boolean;
    failureReason?: string;
    req?: unknown;
}): Promise<void> {
    try {
        const { ip, userAgent } = extractRequestMeta(params.req);
        await LoginHistory.create({
            ...(params.userId ? { userId: params.userId } : {}),
            provider: params.provider,
            success: params.success,
            ...(params.failureReason ? { failureReason: params.failureReason } : {}),
            ipAddress: ip,
            userAgent,
            timestamp: new Date(),
        });
    } catch (err) {
        console.error('[auth] Failed to write LoginHistory:', err);
    }
}

// ─── Profile helpers (now return permissions too) ─────────────────────────────

async function fetchProfile(userId: string, context: string) {
    const oid = toObjectId(userId, context);
    const profile = await UserProfile.findOne({ userId: oid }).lean();

    if (!profile) {
        console.error(`[auth] fetchProfile(${context}): no UserProfile for userId=${userId}`);
        throw new Error('Your account profile is missing. Please contact support or try signing up again.');
    }

    const sanitizedRole = sanitizeRole(profile.role, `fetchProfile(${context})`, userId);
    // Resolve the effective permissions for this user
    const permissions = resolvePermissions({ role: sanitizedRole, permissions: profile.permissions });

    console.log(`[auth] fetchProfile(${context}): userId=${userId} role=${sanitizedRole} permissions=${permissions.length}`);
    return { ...profile, role: sanitizedRole, permissions };
}

async function touchProfile(userId: string, context: string) {
    const oid = toObjectId(userId, context);
    const profile = await UserProfile.findOneAndUpdate(
        { userId: oid },
        { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } },
        { new: true }
    ).lean();

    if (!profile) {
        console.error(`[auth] touchProfile(${context}): no UserProfile for userId=${userId}`);
        throw new Error('Your account profile is missing. Please contact support or try signing up again.');
    }

    const sanitizedRole = sanitizeRole(profile.role, `touchProfile(${context})`, userId);
    const permissions = resolvePermissions({ role: sanitizedRole, permissions: profile.permissions });

    console.log(`[auth] touchProfile(${context}): userId=${userId} role=${sanitizedRole} permissions=${permissions.length}`);
    return { ...profile, role: sanitizedRole, permissions };
}

// ─── Mongoose Adapter ─────────────────────────────────────────────────────────

const MongooseAdapter = () => ({
    async createUser(user: { email: string; emailVerified?: Date | null; name?: string; image?: string }) {
        await connectToDatabase();
        const existing = await User.findOne({ email: normaliseEmail(user.email) });

        if (existing) {
            if (!existing.emailVerified && user.emailVerified) {
                existing.emailVerified = user.emailVerified;
                await existing.save();
            }
            const profile = await UserProfile.findOne({ userId: existing._id }).lean();
            return {
                id: existing._id.toString(),
                email: existing.email,
                emailVerified: existing.emailVerified,
                name: profile?.name || user.name || '',
                image: profile?.avatar || user.image || null,
            };
        }

        const newUser = await User.create({
            email: normaliseEmail(user.email),
            emailVerified: user.emailVerified ?? null,
        });

        // ── NEW: first-time user gets empty permissions array,
        //        resolvePermissions() will fall back to role defaults at runtime.
        await UserProfile.create({
            userId: newUser._id,
            name: user.name || '',
            avatar: user.image as string | undefined,
            role: DEFAULT_ROLE,
            permissions: [],          // ← empty = use role defaults
            completedOnboarding: false,
            loginCount: 0,
        });

        return {
            id: newUser._id.toString(),
            email: newUser.email,
            emailVerified: newUser.emailVerified,
            name: user.name || '',
            image: user.image || null,
        };
    },

    async getUser(id: string) {
        await connectToDatabase();
        const user = await User.findById(id).lean();
        if (!user) return null;
        const profile = await UserProfile.findOne({ userId: user._id }).lean();
        return {
            id: user._id.toString(),
            email: user.email,
            emailVerified: user.emailVerified,
            name: profile?.name || '',
            image: profile?.avatar || null,
        };
    },

    async getUserByEmail(email: string) {
        await connectToDatabase();
        const user = await User.findOne({ email: normaliseEmail(email) }).lean();
        if (!user) return null;
        const profile = await UserProfile.findOne({ userId: user._id }).lean();
        return {
            id: user._id.toString(),
            email: user.email,
            emailVerified: user.emailVerified,
            name: profile?.name || '',
            image: profile?.avatar || null,
        };
    },

    async getUserByAccount({ provider, providerAccountId }: { provider: RegExp | "credentials" | "google" | "github" | "mfa" | undefined; providerAccountId: string }) {
        await connectToDatabase();
        const account = await Account.findOne({ provider, providerAccountId }).lean();
        if (!account) return null;
        const user = await User.findById(account.userId).lean();
        if (!user) return null;
        const profile = await UserProfile.findOne({ userId: user._id }).lean();
        return {
            id: user._id.toString(),
            email: user.email,
            emailVerified: user.emailVerified,
            name: profile?.name || '',
            image: profile?.avatar || null,
        };
    },

    async updateUser(user: { id: string; emailVerified?: Date; name?: string; image?: string }) {
        await connectToDatabase();
        const updated = await User.findByIdAndUpdate(
            user.id,
            { emailVerified: user.emailVerified },
            { new: true }
        ).lean();
        if (user.name || user.image) {
            await UserProfile.findOneAndUpdate(
                { userId: toObjectId(user.id, 'adapter.updateUser') },
                { $set: { name: user.name, avatar: user.image } }
            );
        }
        return {
            id: updated?._id.toString() ?? user.id,
            email: updated?.email ?? '',
            emailVerified: updated?.emailVerified,
            name: user.name,
            image: user.image,
        };
    },

    async linkAccount(account: Record<string, unknown>) {
        await connectToDatabase();
        await Account.findOneAndUpdate(
            { provider: account.provider as RegExp | "credentials" | "google" | "github" | "mfa" | undefined, providerAccountId: account.providerAccountId as string },
            {
                $set: {
                    userId: account.userId,
                    type: account.type,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                    mfaEnabled: false,
                },
                $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true, new: true }
        );
    },

    async createSession(session: unknown) { return session; },
    async getSessionAndUser(_token: string) { return null; },
    async updateSession(session: unknown) { return session; },
    async deleteSession(_token: string) { return; },
});

// ─────────────────────────────────────────────────────────────────────────────
// validateCredentials — shared authorization logic for both user & admin login
// ─────────────────────────────────────────────────────────────────────────────
async function validateCredentials(
    credentials: Record<"email" | "password" | "mfaCode", string> | undefined,
    req: any,
    allowedRoles: UserRole[]
) {
    // 1. Basic presence check
    if (!credentials?.email || !credentials?.password) {
        await logLogin({
            provider: 'credentials',
            success: false,
            failureReason: 'Missing credentials',
            req,
        });
        throw new Error('Please enter your email and password.');
    }

    await connectToDatabase();
    const email = normaliseEmail(credentials.email);
    const user = await User.findOne({ email }).lean();

    // 2. User existence
    if (!user) {
        await logLogin({
            provider: 'credentials',
            success: false,
            failureReason: 'User not found',
            req,
        });
        throw new Error('No account found with this email address.');
    }

    const userId = user._id.toString();

    // 3. Credentials account lookup
    const account = await Account.findOne({
        userId: toObjectId(userId, 'validateCredentials'),
        provider: 'credentials',
    }).select('+password +mfaSecret +mfaBackupCodes');

    if (!account) {
        await logLogin({
            userId,
            provider: 'credentials',
            success: false,
            failureReason: 'No credentials account',
            req,
        });
        throw new Error(
            'This email is linked to a social login. Please use Google or GitHub.'
        );
    }

    // 4. Email verification check
    if (!account.emailVerified) {
        await logLogin({
            userId,
            provider: 'credentials',
            success: false,
            failureReason: 'Email not verified',
            req,
        });
        throw new Error('Please verify your email before signing in.');
    }

    // 5. Password presence check
    if (!account.password) {
        await logLogin({
            userId,
            provider: 'credentials',
            success: false,
            failureReason: 'No password',
            req,
        });
        throw new Error(
            'This account has no password set. Please use social login.'
        );
    }

    // 6. Password validation
    const passwordValid = await bcrypt.compare(
        credentials.password,
        account.password
    );
    if (!passwordValid) {
        await logLogin({
            userId,
            provider: 'credentials',
            success: false,
            failureReason: 'Wrong password',
            req,
        });
        throw new Error('Incorrect password. Please try again.');
    }

    // 7. MFA handling (TOTP + backup codes) – same logic as original
    if (account.mfaEnabled) {
        if (!credentials.mfaCode) {
            throw new Error('MFA_REQUIRED');
        }
        const decryptedSecret = account.decryptMFASecret(account.mfaSecret!);
        const totpValid = verify({
            token: credentials.mfaCode.trim(),
            secret: decryptedSecret,
        });
        if (!totpValid) {
            const crypto = await import('crypto');
            const hashedInput = crypto
                .createHash('sha256')
                .update(credentials.mfaCode.trim().toUpperCase())
                .digest('hex');
            const backupIndex = (account.mfaBackupCodes ?? []).indexOf(hashedInput);
            if (backupIndex === -1) {
                await logLogin({
                    userId,
                    provider: 'mfa',
                    success: false,
                    failureReason: 'Invalid TOTP',
                    req,
                });
                throw new Error(
                    'Invalid verification code. Please try again or use a backup code.'
                );
            }
            const updatedCodes = [...(account.mfaBackupCodes ?? [])];
            updatedCodes.splice(backupIndex, 1);
            account.mfaBackupCodes = updatedCodes;
            await account.save();
        }
    }

    // 8. Fetch profile and enforce allowed roles
    const profile = await touchProfile(userId, 'validateCredentials');
    const validatedRole = sanitizeRole(
        profile.role,
        'validateCredentials',
        userId
    );

    if (!allowedRoles.includes(validatedRole)) {
        const errorMsg =
            allowedRoles.length === 1
                ? `This login is only for ${allowedRoles[0]} accounts.`
                : `This login is only for ${allowedRoles.join(' or ')} accounts.`;
        await logLogin({
            userId,
            provider: account.mfaEnabled ? 'mfa' : 'credentials',
            success: false,
            failureReason: errorMsg,
            req,
        });
        throw new Error(errorMsg);
    }

    console.log(
        `[auth] validateCredentials: userId=${userId} role=${validatedRole}`
    );
    await logLogin({
        userId,
        provider: account.mfaEnabled ? 'mfa' : 'credentials',
        success: true,
        req,
    });

    // 9. Return the user object for NextAuth
    return {
        id: userId,
        email: user.email,
        name: profile.name || '',
        image: profile.avatar || null,
        role: validatedRole,
        mfaEnabled: account.mfaEnabled,
        emailVerified: true,
    };
}

// ─── Auth Configuration ───────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
    adapter: MongooseAdapter() as never,
    session: { strategy: 'jwt', maxAge: TOKEN_MAX_AGE },

    cookies: {
        sessionToken: {
            name: useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
    },

    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                mfaCode: { label: 'MFA Code', type: 'text' },
            },

            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    await logLogin({ provider: 'credentials', success: false, failureReason: 'Missing credentials', req });
                    throw new Error('Please enter your email and password.');
                }

                await connectToDatabase();
                const email = normaliseEmail(credentials.email);
                const user = await User.findOne({ email }).lean();

                if (!user) {
                    await logLogin({ provider: 'credentials', success: false, failureReason: 'User not found', req });
                    throw new Error('No account found with this email address.');
                }

                const userId = user._id.toString();
                const account = await Account.findOne({
                    userId: toObjectId(userId, 'authorize.account'),
                    provider: 'credentials',
                }).select('+password +mfaSecret +mfaBackupCodes');

                if (!account) {
                    await logLogin({ userId, provider: 'credentials', success: false, failureReason: 'No credentials account', req });
                    throw new Error('This email is linked to a social login. Please use Google or GitHub.');
                }
                if (!account.emailVerified) {
                    await logLogin({ userId, provider: 'credentials', success: false, failureReason: 'Email not verified', req });
                    throw new Error('Please verify your email before signing in.');
                }
                if (!account.password) {
                    await logLogin({ userId, provider: 'credentials', success: false, failureReason: 'No password', req });
                    throw new Error('This account has no password set. Please use social login.');
                }

                const passwordValid = await bcrypt.compare(credentials.password, account.password);
                if (!passwordValid) {
                    await logLogin({ userId, provider: 'credentials', success: false, failureReason: 'Wrong password', req });
                    throw new Error('Incorrect password. Please try again.');
                }

                if (account.mfaEnabled) {
                    if (!credentials.mfaCode) throw new Error('MFA_REQUIRED');
                    const decryptedSecret = account.decryptMFASecret(account.mfaSecret!);
                    const totpValid = verify({ token: credentials.mfaCode.trim(), secret: decryptedSecret });
                    if (!totpValid) {
                        const crypto = await import('crypto');
                        const hashedInput = crypto.createHash('sha256')
                            .update(credentials.mfaCode.trim().toUpperCase())
                            .digest('hex');
                        const backupIndex = (account.mfaBackupCodes ?? []).indexOf(hashedInput);
                        if (backupIndex === -1) {
                            await logLogin({ userId, provider: 'mfa', success: false, failureReason: 'Invalid TOTP', req });
                            throw new Error('Invalid verification code. Please try again or use a backup code.');
                        }
                        const updatedCodes = [...(account.mfaBackupCodes ?? [])];
                        updatedCodes.splice(backupIndex, 1);
                        account.mfaBackupCodes = updatedCodes;
                        await account.save();
                    }
                }

                const profile = await touchProfile(userId, 'authorize');
                const validatedRole = sanitizeRole(profile.role, 'authorize', userId);

                console.log(`[auth] authorize: userId=${userId} role=${validatedRole} permissions=${profile.permissions.length}`);
                await logLogin({ userId, provider: account.mfaEnabled ? 'mfa' : 'credentials', success: true, req });

                return {
                    id: userId,
                    email: user.email,
                    name: profile.name || '',
                    image: profile.avatar || null,
                    role: validatedRole,
                    mfaEnabled: account.mfaEnabled,
                    emailVerified: true,
                };
            },
        }),

        CredentialsProvider({
            id: 'user-credentials',   // must match signIn('credentials') calls
            name: 'User Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                mfaCode: { label: 'MFA Code', type: 'text' },
            },
            async authorize(credentials, req) {
                return validateCredentials(credentials, req, ['user']);
            },
        }),

        CredentialsProvider({
            id: 'otp-credentials',
            name: 'OTP Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                otp: { label: 'OTP', type: 'text' },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.otp) {
                    await logLogin({ provider: 'otp', success: false, failureReason: 'Missing credentials', req });
                    throw new Error('Please enter your email and the code.');
                }

                await connectToDatabase();
                const email = normaliseEmail(credentials.email);
                const user = await User.findOne({ email }).lean();
                if (!user) {
                    await logLogin({ provider: 'otp', success: false, failureReason: 'User not found', req });
                    throw new Error('No account found with this email address.');
                }

                const userId = user._id.toString();
                const account = await Account.findOne({ userId: toObjectId(userId, 'otp.authorize'), provider: 'otp' });
                if (!account) {
                    await logLogin({ userId, provider: 'otp', success: false, failureReason: 'No otp account', req });
                    throw new Error('This account does not use code-based sign-in.');
                }
                if (!account.emailVerified) {
                    await logLogin({ userId, provider: 'otp', success: false, failureReason: 'Email not verified', req });
                    throw new Error('Please verify your email first.');
                }

                const result = await verifyOtp('login', email, credentials.otp);
                if (!result.ok) {
                    await logLogin({ userId, provider: 'otp', success: false, failureReason: result.error, req });
                    throw new Error(result.error);
                }

                const profile = await touchProfile(userId, 'otp.authorize');
                const validatedRole = sanitizeRole(profile.role, 'otp.authorize', userId);

                await logLogin({ userId, provider: 'otp', success: true, req });

                return {
                    id: userId,
                    email: user.email,
                    name: profile.name || '',
                    image: profile.avatar || null,
                    role: validatedRole,
                    mfaEnabled: false,
                    emailVerified: true,
                };
            },
        }),

        CredentialsProvider({
            id: 'registration-credentials',
            name: 'Registration Auto Sign-In',
            credentials: {
                email: { label: 'Email', type: 'email' },
                token: { label: 'Token', type: 'text' },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.token) {
                    await logLogin({ provider: 'otp', success: false, failureReason: 'Missing registration token', req });
                    throw new Error('Invalid or expired sign-in link. Please sign in with a login code instead.');
                }

                const email = normaliseEmail(credentials.email);

                let payload;
                try {
                    const verified = await jwtVerify(credentials.token, REGISTRATION_TOKEN_SECRET);
                    payload = verified.payload;
                } catch {
                    await logLogin({ provider: 'otp', success: false, failureReason: 'Invalid/expired registration token', req });
                    throw new Error('This sign-in link has expired. Please sign in with a login code instead.');
                }

                if (payload.purpose !== 'post-registration-login' || payload.email !== email) {
                    await logLogin({ provider: 'otp', success: false, failureReason: 'Registration token payload mismatch', req });
                    throw new Error('This sign-in link has expired. Please sign in with a login code instead.');
                }

                await connectToDatabase();
                const user = await User.findOne({ email }).lean();
                if (!user || user._id.toString() !== payload.userId) {
                    await logLogin({ provider: 'otp', success: false, failureReason: 'Registration token user mismatch', req });
                    throw new Error('No account found with this email address.');
                }

                const userId = user._id.toString();
                const account = await Account.findOne({ userId: toObjectId(userId, 'registration.authorize'), provider: 'otp' });
                if (!account || !account.emailVerified) {
                    await logLogin({ userId, provider: 'otp', success: false, failureReason: 'Email not verified', req });
                    throw new Error('Please verify your email first.');
                }

                const profile = await touchProfile(userId, 'registration.authorize');
                const validatedRole = sanitizeRole(profile.role, 'registration.authorize', userId);

                await logLogin({ userId, provider: 'otp', success: true, req });

                return {
                    id: userId,
                    email: user.email,
                    name: profile.name || '',
                    image: profile.avatar || null,
                    role: validatedRole,
                    mfaEnabled: false,
                    emailVerified: true,
                };
            },
        }),

        // ── 2. Admin / sub‑admin sign-in ────────────────────────────────────────
        CredentialsProvider({
            id: 'admin-credentials',   // must match signIn('admin-credentials') calls
            name: 'Admin Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                mfaCode: { label: 'MFA Code', type: 'text' },
            },
            async authorize(credentials, req) {
                return validateCredentials(credentials, req, ['admin', 'sub-admin']);
            },
        }),

        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: !!profile.email,
                };
            },
        }),

        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            profile(profile) {
                return {
                    id: String(profile.id),
                    name: profile.name || profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                    emailVerified: !!profile.email,
                };
            },
        }),
    ],

    callbacks: {
        async signIn({ user, account: oauthAccount }) {
            try {
                await connectToDatabase();

                if (oauthAccount?.provider === 'credentials' || oauthAccount?.provider === 'otp') {
                    const profile = await UserProfile.findOne({
                        userId: toObjectId(user.id, 'signIn.credentials.blockCheck'),
                    }).lean();
                    if (profile?.isBlocked) throw new Error('Your account has been suspended. Please contact support.');
                    console.log(`[auth] signIn(credentials): userId=${user.id} role=${(user as any).role}`);
                    return true;
                }

                if (oauthAccount?.provider === 'google' || oauthAccount?.provider === 'github') {
                    const provider = oauthAccount.provider as OAuthProvider;
                    let dbUser = await User.findOne({ email: normaliseEmail(user.email!) }).lean();

                    if (!dbUser) {
                        // New user — adapter hasn't created them yet on first OAuth sign-in.
                        // Return true and let NextAuth + adapter complete the flow.
                        // The jwt() callback will fetch the profile on the next request.
                        console.log(`[auth] signIn(${provider}): new user, letting adapter create them`);
                        return true;
                    }

                    const dbUserId = dbUser._id.toString();
                    const blockCheck = await UserProfile.findOne({
                        userId: toObjectId(dbUserId, `signIn.${provider}.blockCheck`),
                    }).lean();
                    if (blockCheck?.isBlocked) throw new Error('Your account has been suspended. Please contact support.');

                    await Account.findOneAndUpdate(
                        { provider: oauthAccount.provider, providerAccountId: oauthAccount.providerAccountId },
                        {
                            $set: {
                                userId: dbUser._id,
                                type: oauthAccount.type,
                                access_token: oauthAccount.access_token,
                                refresh_token: oauthAccount.refresh_token,
                                expires_at: oauthAccount.expires_at,
                                token_type: oauthAccount.token_type,
                                scope: oauthAccount.scope,
                                id_token: oauthAccount.id_token,
                                session_state: oauthAccount.session_state,
                                emailVerified: true,
                                emailVerifiedAt: new Date(),
                                mfaEnabled: false,
                            },
                            $setOnInsert: { createdAt: new Date() },
                        },
                        { upsert: true }
                    );

                    const profile = await touchProfile(dbUserId, `signIn.${provider}`);
                    const validatedRole = sanitizeRole(profile.role, `signIn.${provider}`, dbUserId);

                    user.id = dbUserId;
                    user.role = validatedRole;
                    (user as any).mfaEnabled = false;
                    (user as any).emailVerified = true;
                    if (!profile.dob) user.needsOnboarding = true;

                    console.log(`[auth] signIn(${provider}): attached role=${validatedRole} to user.id=${dbUserId}`);
                    await logLogin({ userId: dbUserId, provider, success: true });
                }

                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes('suspended') || message.includes('support')) throw err;
                console.error('[auth] signIn callback error:', err);
                return false;
            }
        },

        /**
         * JWT callback — always refreshes role AND permissions from DB.
         * Permissions are stored as a flat string[] in the JWT so the
         * Edge-runtime middleware can read them without a DB call.
         */
        async jwt({ token, user, trigger, session }) {
            console.log('[auth] jwt:', {
                hasUser: !!user,
                userId: user?.id,
                userRole: (user as any)?.role,
                tokenId: token?.id,
                tokenRole: token?.role,
                trigger,
            });

            // ── First sign-in: bootstrap from the user object ─────────────────
            if (user) {
                token.id = user.id;
                token.role = (user as any).role
                    ? sanitizeRole((user as any).role, 'jwt.user', user.id)
                    : undefined;
                token.mfaEnabled = (user as any).mfaEnabled ?? false;
                token.emailVerified = (user as any).emailVerified ?? false;
                token.requiresMFA = user.requiresMFA ?? false;
                token.needsOnboarding = user.needsOnboarding ?? false;
            }

            // ── Always refresh role + permissions from DB ─────────────────────
            // This makes role/permission changes effective on the very next
            // request without requiring the user to log out and back in.
            if (token.id) {
                const lastRefresh = (token.permissionsRefreshedAt as number) ?? 0;
                const secondsSinceRefresh = Math.floor(Date.now() / 1000) - lastRefresh;
                const needsRefresh = trigger !== 'update' && (!token.permissions || secondsSinceRefresh > 300);
                if (needsRefresh) {
                    try {
                        await connectToDatabase();
                        const profileDoc = await UserProfile.findOne({
                            userId: new mongoose.Types.ObjectId(token.id)
                        }).lean();

                        if (!profileDoc) {
                            token.permissions = ROLE_DEFAULT_PERMISSIONS[DEFAULT_ROLE];
                            return token;
                        }

                        if (profileDoc.isBlocked) {
                            console.warn(`[auth] jwt.refresh: userId=${token.id} is blocked — revoking access`);
                            token.isBlocked = true;
                            token.permissions = [];
                            return token;
                        }

                        const sanitizedRole = sanitizeRole(profileDoc.role, 'jwt.refresh', token.id);
                        token.role = sanitizedRole as UserRole;
                        token.permissions = resolvePermissions({ role: sanitizedRole, permissions: profileDoc.permissions });
                        token.isBlocked = false;
                        token.permissionsRefreshedAt = Math.floor(Date.now() / 1000);
                        token.subscription = {
                            planKey: profileDoc.subscription?.planKey ?? 'free',
                            status: profileDoc.subscription?.status ?? 'active',
                            listingQuota: profileDoc.subscription?.listingQuota ?? 1,
                            featuredSlots: profileDoc.subscription?.featuredSlots ?? 0,
                            currentPeriodEnd: profileDoc.subscription?.currentPeriodEnd ?? undefined,
                            cancelAtPeriodEnd: profileDoc.subscription?.cancelAtPeriodEnd ?? false,   // ← add
                            applicantLimit: profileDoc.subscription?.applicantLimit ?? 0,              // ← add
                            manualPostLimit: profileDoc.subscription?.manualPostLimit ?? 0,            // ← add
                            autoPostLimit: profileDoc.subscription?.autoPostLimit ?? 0,                // ← add
                            postVisibilityDays: profileDoc.subscription?.postVisibilityDays ?? 30,     // ← add
                            walletBalance: profileDoc.subscription?.walletBalance ?? 0,
                            extrasActive: (profileDoc.subscription as any)?.extrasActive ?? false,
                            extrasExpiresAt: profileDoc.subscription?.extrasExpiresAt?.toISOString?.() ?? null,
                        };
                    } catch (err) {
                        console.error('[auth] jwt: failed to refresh:', err);
                    }
                }
            }

            // ── session.update() trigger ──────────────────────────────────────
            if (trigger === 'update' && token.id) {
                // Explicit session data passed in (name/image/role changes)
                if (session?.name) token.name = session.name;
                if (session?.image) token.image = session.image;
                if (session?.role && VALID_ROLES.includes(session.role as UserRole)) {
                    token.role = session.role as UserRole;
                }

                // ── KEY FIX: re-fetch subscription + permissions from DB ──────
                // The polling loop calls update() after Stripe checkout completes.
                // Without this, every poll returns the same stale JWT — the DB
                // re-fetch in the session callback cannot mutate the sealed token.
                try {
                    await connectToDatabase();
                    const profileDoc = await UserProfile.findOne({
                        userId: new mongoose.Types.ObjectId(token.id),
                    }).lean();

                    if (profileDoc && !profileDoc.isBlocked) {
                        const sanitizedRole = sanitizeRole(profileDoc.role, 'jwt.update', token.id);
                        token.role = sanitizedRole as UserRole;
                        token.permissions = resolvePermissions({
                            role: sanitizedRole,
                            permissions: profileDoc.permissions,
                        });
                        token.subscription = {
                            planKey: profileDoc.subscription?.planKey ?? 'free',
                            status: profileDoc.subscription?.status ?? 'active',
                            listingQuota: profileDoc.subscription?.listingQuota ?? 1,
                            featuredSlots: profileDoc.subscription?.featuredSlots ?? 0,
                            currentPeriodEnd: profileDoc.subscription?.currentPeriodEnd ?? undefined,
                            cancelAtPeriodEnd: profileDoc.subscription?.cancelAtPeriodEnd ?? false,   // ← add
                            applicantLimit: profileDoc.subscription?.applicantLimit ?? 0,              // ← add
                            manualPostLimit: profileDoc.subscription?.manualPostLimit ?? 0,            // ← add
                            autoPostLimit: profileDoc.subscription?.autoPostLimit ?? 0,                // ← add
                            postVisibilityDays: profileDoc.subscription?.postVisibilityDays ?? 30,     // ← add
                            walletBalance: profileDoc.subscription?.walletBalance ?? 0,
                            extrasActive: (profileDoc.subscription as any)?.extrasActive ?? false,
                            extrasExpiresAt: profileDoc.subscription?.extrasExpiresAt?.toISOString?.() ?? null,
                        };
                        // Reset the TTL so the next regular request also gets fresh data
                        token.permissionsRefreshedAt = Math.floor(Date.now() / 1000);
                    }
                } catch (err) {
                    console.error('[auth] jwt: failed to refresh on update trigger:', err);
                }
            }

            return token;
        },

        async session({ session, trigger, token }) {
            if (session.user) {
                session.user.id = token.id as string;

                let finalRole: UserRole;
                if (token.role && VALID_ROLES.includes(token.role)) {
                    finalRole = token.role;
                } else {
                    finalRole = DEFAULT_ROLE;
                    console.error(`[auth] session: invalid token.role="${token.role}", using default for id=${token.id}`);
                }

                session.user.role = finalRole;
                session.user.mfaEnabled = (token.mfaEnabled as boolean) ?? false;
                session.user.emailVerified = (token.emailVerified as boolean) ?? false;
                // Expose resolved permissions to client via session
                session.user.needsOnboarding = token.needsOnboarding as boolean ?? false;
                session.user.permissions = (token.permissions as Permission[]) ?? [];

                session.user.subscription = token.subscription ?? {
                    planKey: 'free',
                    status: 'active',
                    listingQuota: 1,
                    featuredSlots: 0,
                    currentPeriodEnd: undefined,
                    cancelAtPeriodEnd: false,
                    applicantLimit: 0,
                    manualPostLimit: 0,
                    autoPostLimit: 0,
                    postVisibilityDays: 30,
                    walletBalance: 0,
                    extrasActive: false,
                    extrasExpiresAt: null,
                };
                console.log(`[auth] session: userId=${token.id} role=${finalRole} permissions=${session.user.permissions.length}`);
            }
            return session;
        },

        async redirect({ url, baseUrl }) {
            if (url.includes('needsOnboarding=true')) return `${baseUrl}/auth/onboarding`;
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            if (url.startsWith(baseUrl)) return url;
            return baseUrl;
        },
    },

    events: {
        async signOut({ token }) {
            if (!token?.id) return;
            try {
                await connectToDatabase();
                await LogoutHistory.create({
                    userId: token.id,
                    sessionId: token.jti as any,
                    timestamp: new Date(),
                });
            } catch (err) {
                console.error('[auth] signOut event error:', err);
            }
        },
    },

    pages: {
        signIn: '/auth/sign-in',
        error: '/auth/error',
        newUser: '/auth/onboarding',
    },

    debug: process.env.NODE_ENV === 'development',
};

export { sanitizeRole, VALID_ROLES, DEFAULT_ROLE };
export type { UserRole };