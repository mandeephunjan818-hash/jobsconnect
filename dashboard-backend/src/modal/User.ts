import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';
import {
    type Permission,
    ROLE_DEFAULT_PERMISSIONS,
} from '@/config/permissions'; // adjust path as needed

// ==========================================
// 1. USER SCHEMA
// ==========================================

export interface IUserDocument extends Document {
    email: string;
    emailVerified: Date | null;
    createdAt: Date;
    updatedAt: Date;
    accounts?: IAccountDocument[];
    profile?: IUserProfileDocument;
}

const UserSchema = new Schema<IUserDocument>({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        index: true,
    },
    emailVerified: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

UserSchema.virtual('accounts', {
    ref: 'Account',
    localField: '_id',
    foreignField: 'userId',
});

UserSchema.virtual('profile', {
    ref: 'UserProfile',
    localField: '_id',
    foreignField: 'userId',
    justOne: true,
});

// ==========================================
// 2. ACCOUNT SCHEMA
// ==========================================

export interface IAccountDocument extends Document {
    userId: mongoose.Types.ObjectId;
    provider: RegExp | "credentials" | "google" | "github" | "mfa" | "otp" | undefined;
    providerAccountId: string;
    type?: 'credentials' | 'oauth' | 'otp';
    password?: string;
    emailVerified: boolean;
    emailVerifiedAt?: Date;
    mfaEnabled: boolean;
    mfaSecret?: string;
    mfaBackupCodes?: string[];
    mfaTempSecret?: string;
    mfaTempBackupCodes?: string[];
    mfaEnabledAt?: Date;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    session_state?: string;
    createdAt: Date;
    updatedAt: Date;
    verifyPassword(password: string): Promise<boolean>;
    setPassword(password: string): Promise<void>;
    encryptMFASecret(secret: string): string;
    decryptMFASecret(encrypted: string): string;
}

const AccountSchema = new Schema<IAccountDocument>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true,
    },
    provider: {
        type: String,
        required: [true, 'Provider is required'],
        enum: ['credentials', 'google', 'github', 'otp'],
        index: true,
    },
    providerAccountId: {
        type: String,
        required: [true, 'Provider account ID is required'],
        index: true,
    },
    type: {
        type: String,
        enum: ['credentials', 'oauth', 'otp'],
        default: 'credentials',
    },
    password: {
        type: String,
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerifiedAt: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaBackupCodes: [{ type: String, select: false }],
    mfaTempSecret: { type: String, select: false },
    mfaTempBackupCodes: [{ type: String, select: false }],
    mfaEnabledAt: { type: Date },
    access_token: { type: String, select: false },
    refresh_token: { type: String, select: false },
    expires_at: { type: Number },
    token_type: { type: String },
    scope: { type: String },
    id_token: { type: String, select: false },
    session_state: { type: String },
}, {
    timestamps: true,
});

AccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
AccountSchema.index({ userId: 1, provider: 1 });

AccountSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

AccountSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
    if (!this.password) return false;
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, this.password);
};

AccountSchema.methods.setPassword = async function (password: string): Promise<void> {
    this.password = password;
    await this.save();
};

const RAW_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY;

if (process.env.NODE_ENV === 'production') {
    if (!RAW_ENCRYPTION_KEY) {
        throw new Error(
            '[User model] MFA_ENCRYPTION_KEY must be set in production. ' +
            'Without it, every user\'s MFA secret would be encrypted with a ' +
            'key checked into source control.'
        );
    }
    if (RAW_ENCRYPTION_KEY.length < 32) {
        throw new Error(
            '[User model] MFA_ENCRYPTION_KEY must be at least 32 characters for AES-256.'
        );
    }
}

const ENCRYPTION_KEY = RAW_ENCRYPTION_KEY || 'dev-only-fallback-key-32-chars!!';

AccountSchema.methods.encryptMFASecret = function (secret: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
};

AccountSchema.methods.decryptMFASecret = function (encrypted: string): string {
    const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

// ==========================================
// 3. USER PROFILE SCHEMA  (permissions added)
// ==========================================

export interface ISubscriptionExtras {
    listingQuota: number;
    applicantLimit: number;
    manualPostLimit: number;
    autoPostLimit: number;
    jobBankRequestLimit: number;
}

export interface ISubscription {
    planKey: string;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd: boolean;
    listingQuota: number;
    applicantLimit: number;
    manualPostLimit: number;
    autoPostLimit: number;
    postVisibilityDays: number;
    featuredSlots: number;
    jobBankRequestLimit?: number;
    lastWebhookEventAt?: number;
    extras?: ISubscriptionExtras;
    walletBalance?: number;
    extrasExpiresAt?: Date;
}

export interface IUserProfileDocument extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    dob?: string;
    phone?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
    completedOnboarding: boolean;
    lastLoginAt?: Date;
    loginCount: number;
    role: 'user' | 'sub-admin' | 'admin';
    /**
     * Explicit permission overrides for this user.
     * When empty the role's DEFAULT_*_PERMISSIONS apply.
     * When populated these are the EXACT permissions the user has
     * (i.e. they fully replace the role defaults — use the admin UI
     * to merge role defaults + custom grants before saving here).
     */
    permissions: Permission[];
    subscription: ISubscription;
    createdAt: Date;
    updatedAt: Date;
    isBlocked: boolean;
    blockedAt?: Date;
    blockReason?: string;
}

const UserProfileSchema = new Schema<IUserProfileDocument>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    dob: {
        type: String,
        match: [/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'],
    },
    phone: {
        type: String,
        match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    avatar: { type: String },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    completedOnboarding: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    role: {
        type: String,
        enum: ['user', 'sub-admin', 'admin'],
        default: 'user',
    },

    // ── NEW: per-user permission overrides ───────────────────────────────────
    // Empty array  → resolve permissions from ROLE_DEFAULT_PERMISSIONS at
    //                runtime (auth.ts / middleware).
    // Non-empty    → these exact permissions are used (admin can customise).
    permissions: {
        type: [String],
        default: [],
        // Light validation: each entry must match the "METHOD:path" pattern
        validate: {
            validator: (arr: string[]) =>
                arr.every((p) => /^(GET|POST|PUT|PATCH|DELETE):/.test(p)),
            message: 'Each permission must start with an HTTP verb followed by a colon.',
        },
    },

    subscription: {
        planKey: { type: String, default: 'free' },
        status: { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active' },
        stripeCustomerId: { type: String },
        stripeSubscriptionId: { type: String },
        currentPeriodStart: { type: Date },
        currentPeriodEnd: { type: Date },
        cancelAtPeriodEnd: { type: Boolean, default: false },
        listingQuota: { type: Number, default: 1 },
        applicantLimit: { type: Number, default: 0 },
        manualPostLimit: { type: Number, default: 0 },
        autoPostLimit: { type: Number, default: 0 },
        postVisibilityDays: { type: Number, default: 30 },
        featuredSlots: { type: Number, default: 0 },
        jobBankRequestLimit: { type: Number, default: 5 },
        lastWebhookEventAt: { type: Number },
        extras: {
            listingQuota: { type: Number, default: 0 },
            applicantLimit: { type: Number, default: 0 },
            manualPostLimit: { type: Number, default: 0 },
            autoPostLimit: { type: Number, default: 0 },
            jobBankRequestLimit: { type: Number, default: 0 },
        },
        walletBalance: { type: Number, default: 0 },
        extrasExpiresAt: { type: Date },
    },

    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date },
    blockReason: { type: String },
}, {
    timestamps: true,
});

// ==========================================
// 4. LOGIN / LOGOUT HISTORY
// ==========================================

export interface ILoginHistoryDocument extends Document {
    userId: mongoose.Types.ObjectId;
    provider: 'credentials' | 'google' | 'github' | 'mfa' | 'otp';
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: { country?: string; city?: string; timezone?: string };
    timestamp: Date;
}

const LoginHistorySchema = new Schema<ILoginHistoryDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['credentials', 'google', 'github', 'mfa', 'otp'], required: true },
    success: { type: Boolean, required: true, default: false },
    failureReason: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    location: { country: String, city: String, timezone: String },
    timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

LoginHistorySchema.index({ userId: 1, timestamp: -1 });
LoginHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export interface ILogoutHistoryDocument extends Document {
    userId: mongoose.Types.ObjectId;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}

const LogoutHistorySchema = new Schema<ILogoutHistoryDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, trim: true, index: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

LogoutHistorySchema.index({ userId: 1, timestamp: -1 });
LogoutHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ==========================================
// 5. VERIFICATION TOKEN
// ==========================================

export interface IVerificationTokenDocument extends Document {
    identifier: string;
    token: string;
    expires: Date;
    type: 'email_verification' | 'password_reset';
    usedAt?: Date;
    createdAt: Date;
}

const VerificationTokenSchema = new Schema<IVerificationTokenDocument>({
    identifier: { type: String, required: [true, 'Identifier (email) is required'], index: true },
    token: { type: String, required: [true, 'Token is required'], index: true },
    expires: { type: Date, required: [true, 'Expiration date is required'], index: true },
    type: {
        type: String,
        enum: ['email_verification', 'password_reset'],
        required: [true, 'Token type is required'],
    },
    usedAt: { type: Date },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

// ==========================================
// 6. HELPER — resolve effective permissions
// ==========================================

/**
 * Returns the effective permission list for a profile.
 *
 * Rules:
 *  - If the profile has explicit `permissions` stored → use those.
 *  - Otherwise fall back to the role's DEFAULT_*_PERMISSIONS.
 *
 * Import and call this wherever you need the final list (auth.ts, API routes).
 */
export function resolvePermissions(profile: {
    role: string;
    permissions?: string[];
}): Permission[] {
    if (profile.permissions && profile.permissions.length > 0) {
        return profile.permissions as Permission[];
    }
    return ROLE_DEFAULT_PERMISSIONS[profile.role] ?? ROLE_DEFAULT_PERMISSIONS['user'];
}

// ==========================================
// 7. EXPORT MODELS
// ==========================================

export const User: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export const Account: Model<IAccountDocument> =
    mongoose.models.Account || mongoose.model<IAccountDocument>('Account', AccountSchema);

export const UserProfile: Model<IUserProfileDocument> =
    mongoose.models.UserProfile || mongoose.model<IUserProfileDocument>('UserProfile', UserProfileSchema);

export const VerificationToken: Model<IVerificationTokenDocument> =
    mongoose.models.VerificationToken || mongoose.model<IVerificationTokenDocument>('VerificationToken', VerificationTokenSchema);

export const LoginHistory: Model<ILoginHistoryDocument> =
    mongoose.models.LoginHistory || mongoose.model<ILoginHistoryDocument>('LoginHistory', LoginHistorySchema);

export const LogoutHistory: Model<ILogoutHistoryDocument> =
    mongoose.models.LogoutHistory || mongoose.model<ILogoutHistoryDocument>('LogoutHistory', LogoutHistorySchema);