/**
 * JobBankRequest.helpers.ts
 *
 * Serialisation helpers — safe, lean objects for API responses.
 */

import { IJobBankRequest, JobBankRequestStatus } from './JobBankRequest';

// ─────────────────────────────────────────────────────────────
// Serialised shape returned to clients
// ─────────────────────────────────────────────────────────────
export interface JobBankRequestItem {
    id: string;
    userId: string;
    jobBankId: string;
    userNotes?: string;
    // NEW: site preferences supplied by the user at submission time
    sites: string[];
    status: JobBankRequestStatus;
    listingId?: string | null;
    listingCollection?: 'Listing' | 'ListingDraft' | null;
    adminNote?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// API response envelopes
// ─────────────────────────────────────────────────────────────
export interface JobBankRequestApiResponse {
    data: JobBankRequestItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// Serialiser  (works with both lean objects and Mongoose docs)
// ─────────────────────────────────────────────────────────────
export function toJobBankRequestItem(
    doc: IJobBankRequest | (Omit<IJobBankRequest, keyof Document> & { _id: any }),
): JobBankRequestItem {
    const d = doc as any;
    return {
        id: d._id?.toString() ?? d.id,
        userId: d.userId?.toString(),
        jobBankId: d.jobBankId,
        userNotes: d.userNotes ?? undefined,
        // Guarantee always an array even for old documents that pre-date the field
        sites: Array.isArray(d.sites) ? d.sites : [],
        status: d.status,
        listingId: d.listingId ?? null,
        listingCollection: d.listingCollection ?? null,
        adminNote: d.adminNote ?? null,
        reviewedBy: d.reviewedBy?.toString() ?? null,
        reviewedAt: d.reviewedAt ? new Date(d.reviewedAt).toISOString() : null,
        createdAt: new Date(d.createdAt).toISOString(),
        updatedAt: new Date(d.updatedAt).toISOString(),
    };
}