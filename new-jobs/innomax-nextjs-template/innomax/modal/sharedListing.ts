/**
 * sharedListing.ts
 *
 * Single source of truth for all sub-schemas shared between
 * Listing and ListingDraft.
 *
 * ⚠️  This file must NEVER import from Listing.ts or ListingDraft.ts.
 *     Both of those models import from here — importing back would
 *     create a circular dependency that breaks Mongoose's type
 *     inference and causes "This expression is not callable" errors.
 */

import { Schema } from 'mongoose';

// ─────────────────────────────────────────────────────────────
// Supported site slugs
// ─────────────────────────────────────────────────────────────
export const KNOWN_SITES = [
    'jobs-connect.vercel.app',
    'new-jobs-fawn.vercel.app',
    'jobsrefugee.ca',
    'vulnerableyouthsjobs.ca',
    'accesscareers.ca',
    'indigenouspeoplesjobs.ca',
    '*',
] as const;

export type SiteSlug = (typeof KNOWN_SITES)[number];

// ─────────────────────────────────────────────────────────────
// Job-ID generator
// Format: JOB-<YEAR>-<8 random uppercase alphanumeric chars>
// Example: JOB-2025-K3X9PQ7R
// Collision probability at 10 000 listings: ~0.0004%
// ─────────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous charset (no 0/O/1/I)

export function generateJobId(): string {
    const year = new Date().getFullYear();
    let rand = '';
    if (
        typeof globalThis !== 'undefined' &&
        typeof (globalThis as any).crypto?.getRandomValues === 'function'
    ) {
        const bytes = new Uint8Array(8);
        (globalThis as any).crypto.getRandomValues(bytes);
        for (const b of bytes) rand += CHARS[b % CHARS.length];
    } else {
        for (let i = 0; i < 8; i++) rand += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return `JOB-${year}-${rand}`;
}

// ─────────────────────────────────────────────────────────────
// Admin note
// ─────────────────────────────────────────────────────────────
export interface IAdminNote {
    message: string;
    type: 'status_change' | 'update_request' | 'update_rejection' | 'general';
    createdAt: Date;
    createdBy?: string;
}

export const AdminNoteSchema = new Schema<IAdminNote>(
    {
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ['status_change', 'update_request', 'update_rejection', 'general'],
            required: true,
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: String },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Shift
// ─────────────────────────────────────────────────────────────
export interface IShift {
    label: string;
    startTime?: string;
    endTime?: string;
    days?: string[];
}

export const ShiftSchema = new Schema<IShift>(
    {
        label: { type: String, required: true },
        startTime: { type: String },
        endTime: { type: String },
        days: { type: [String], default: [] },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Slot  (one location + its shifts + pay)
// ─────────────────────────────────────────────────────────────
export interface ISlot {
    location: string;
    province: string;
    city: string;
    shifts: IShift[];
    jobPay: number;
    jobVacancy?: string;
    jobStartingTime?: string;
    isActive: boolean;
}

export const SlotSchema = new Schema<ISlot>(
    {
        location: { type: String, required: true },
        province: { type: String, required: true },
        city: { type: String, required: true },
        shifts: { type: [ShiftSchema], default: [] },
        jobPay: { type: Number, required: true },
        jobVacancy: { type: String },
        jobStartingTime: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { _id: true },
);

// ─────────────────────────────────────────────────────────────
// Site window  (per-site visibility range)
// ─────────────────────────────────────────────────────────────
export interface ISiteWindow {
    site: string;
    startAt: Date;
    endAt: Date;
    durationDays: number; // computed on pre-save
}

export const SiteWindowSchema = new Schema<ISiteWindow>(
    {
        site: {
            type: String,
            required: true,
            enum: KNOWN_SITES,
        },
        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },
        durationDays: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Campaign window  (backward compat + scheduler hook)
// ─────────────────────────────────────────────────────────────
export interface ICampaignWindow {
    label: string;
    startAt: Date;
    endAt: Date;
}

export const CampaignWindowSchema = new Schema<ICampaignWindow>(
    {
        label: { type: String, required: true },
        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Scheduler refs  (QStash message IDs per site)
//
// Stored so we can cancel/replace jobs when schedules change.
//
// Layout:
//   schedulerRefs: {
//     'new-jobs-fawn.vercel.app': {
//       startMsgId:  'msg_abc123',   // fires at siteWindow.startAt
//       expiryMsgId: 'msg_xyz789',   // fires at siteWindow.endAt
//     },
//     ...
//   }
//
// Rules:
//   - startMsgId is only present while the window hasn't started yet.
//     Once the listing is live on that site it is cleared (no need to
//     cancel a job that already fired).
//   - expiryMsgId is present for every currently-active window and is
//     cleared when the window expires or is removed.
//   - The entire site key is deleted when a site window is removed.
//   - On Vercel Hobby the in-memory setTimeout path never stores IDs
//     here; only the QStash path does.  That is fine — cancel helpers
//     check for undefined before calling QStash.
// ─────────────────────────────────────────────────────────────
export interface ISchedulerRef {
    /** QStash message ID for the publish/start trigger (may be absent if already fired). */
    startMsgId?: string;
    /** QStash message ID for the expiry trigger. */
    expiryMsgId?: string;
}

/**
 * schedulerRefs is stored as a plain Mixed object keyed by site slug.
 * e.g. { 'new-jobs-fawn.vercel.app': { startMsgId: '...', expiryMsgId: '...' } }
 *
 * We use Schema.Types.Mixed rather than a typed sub-schema because the
 * keys are dynamic (one per site slug) and Mongoose does not support
 * dynamic-key sub-documents natively without a Map type.  A Map would
 * work too but Mixed is simpler to query and serialize here.
 */
export const SchedulerRefsSchema = Schema.Types.Mixed;

// ─────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────

/** Whole-day difference (rounds down, minimum 1). */
export function daysBetween(start: Date, end: Date): number {
    return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

/**
 * Derive a CampaignWindow from an array of SiteWindows.
 * Returns undefined when the array is empty.
 */
export function deriveCampaignWindow(
    label: string,
    siteWindows: Pick<ISiteWindow, 'startAt' | 'endAt'>[],
): ICampaignWindow | undefined {
    if (!siteWindows.length) return undefined;
    const startAt = new Date(Math.min(...siteWindows.map(w => w.startAt.getTime())));
    const endAt = new Date(Math.max(...siteWindows.map(w => w.endAt.getTime())));
    return { label, startAt, endAt };
}

export function normalizeSiteWindow(w: any): {
    site: string;
    startAt: Date;
    endAt: Date;
    durationDays: number;
    [key: string]: any;
} {
    return {
        ...w,
        startAt: w.startAt instanceof Date ? w.startAt : new Date(w.startAt),
        endAt: w.endAt instanceof Date ? w.endAt : new Date(w.endAt),
    };
}

export function normalizeSiteWindows(
    windows: any[],
): Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> {
    return windows.map(w => normalizeSiteWindow(w));
}