/**
 * JobBankRequest.ts
 *
 * One document per user's Job Bank ID submission request.
 *
 * Pipeline:
 *   1. User submits a Job Bank ID (+ optional notes + optional sites) via the dashboard.
 *   2. Admin sees it in the admin queue, fetches the listing from Job Bank,
 *      creates/links a Listing document, then updates this record with
 *      listingId + status = 'fulfilled'.
 *   3. The listing goes live within ~24 hours of submission.
 *
 * Relations:
 *   - userId      → User._id  (who submitted it)
 *   - listingId   → Listing._id or ListingDraft._id (filled by admin)
 *
 * Import rule:
 *   ✅  import FROM sharedListing (for KNOWN_SITES / SiteSlug)
 *   ❌  never import from Listing.ts or ListingDraft.ts directly
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─────────────────────────────────────────────────────────────
// Status enum
// ─────────────────────────────────────────────────────────────
export type JobBankRequestStatus =
    | 'pending'      // just submitted, admin hasn't acted yet
    | 'processing'   // admin is fetching / creating the listing
    | 'fulfilled'    // listing created & linked
    | 'rejected'     // invalid Job Bank ID / duplicate / admin rejected
    | 'duplicate';   // same Job Bank ID already exists in the system

// ─────────────────────────────────────────────────────────────
// Known sites (keep in sync with the frontend KNOWN_SITES list)
// ─────────────────────────────────────────────────────────────
export const KNOWN_SITES = [
    'jobs-connect.vercel.app',
    'new-jobs-fawn.vercel.app',
    'jobsrefugee.ca',
    'vulnerableyouthsjobs.ca',
    'accesscareers.ca',
    'indigenouspeoplesjobs.ca',
] as const;

export type SiteHostname = (typeof KNOWN_SITES)[number];

// ─────────────────────────────────────────────────────────────
// Document interface
// ─────────────────────────────────────────────────────────────
export interface IJobBankRequest extends Document {
    // ── Who submitted ────────────────────────────────────────
    userId: mongoose.Types.ObjectId;

    // ── What they want ────────────────────────────────────────
    /**
     * The Job Bank Canada job ID (e.g. "3213456").
     * Used by admin to fetch listing details automatically.
     */
    jobBankId: string;

    /**
     * Optional notes from the user (e.g. preferred sites, urgency).
     */
    userNotes?: string;

    /**
     * Optional list of site hostnames the user wants the listing published on.
     * Empty array = admin decides.
     */
    sites: string[];

    // ── Admin response ────────────────────────────────────────
    status: JobBankRequestStatus;

    /**
     * Linked Listing or ListingDraft _id — filled once admin creates
     * the listing. Stored as a plain string (not a ref) because the
     * target collection can be either Listing or ListingDraft.
     */
    listingId?: string;

    listingCollection?: 'Listing' | 'ListingDraft';

    /** Internal admin note (reason for rejection, processing notes, etc.) */
    adminNote?: string;

    /** The admin user ID who acted on this request. */
    reviewedBy?: mongoose.Types.ObjectId;

    /** When the admin acted on this request. */
    reviewedAt?: Date;

    // ── Timestamps ────────────────────────────────────────────
    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────
const JobBankRequestSchema = new Schema<IJobBankRequest>(
    {
        // ── Who submitted ───────────────────────────────────────
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'userId is required'],
            index: true,
        },

        // ── What they want ──────────────────────────────────────
        jobBankId: {
            type: String,
            required: [true, 'jobBankId is required'],
            trim: true,
            index: true,
        },
        userNotes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes cannot exceed 1000 characters'],
        },

        // ── Sites preference ────────────────────────────────────
        sites: {
            type: [String],
            default: [],
            validate: {
                validator: (arr: string[]) =>
                    arr.every((s) => (KNOWN_SITES as readonly string[]).includes(s)),
                message: 'One or more site hostnames are not recognised.',
            },
        },

        // ── Admin response ──────────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'processing', 'fulfilled', 'rejected', 'duplicate'],
            default: 'pending',
            index: true,
        },
        listingId: {
            type: String,
            default: null,
        },
        listingCollection: {
            type: String,
            enum: ['Listing', 'ListingDraft'],
            default: null,
        },
        adminNote: {
            type: String,
            trim: true,
            maxlength: [2000, 'Admin note cannot exceed 2000 characters'],
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────

// Fast admin queue lookup: pending requests ordered by oldest first
JobBankRequestSchema.index({ status: 1, createdAt: 1 });

// Per-user history
JobBankRequestSchema.index({ userId: 1, createdAt: -1 });

// Duplicate detection
JobBankRequestSchema.index({ jobBankId: 1, userId: 1 });

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────
const JobBankRequest: Model<IJobBankRequest> =
    mongoose.models.JobBankRequest ||
    mongoose.model<IJobBankRequest>('JobBankRequest', JobBankRequestSchema);

export default JobBankRequest;