/**
 * src/modal/BlogPost.ts
 *
 * Per-site blog scheduling model.
 *
 * Key change from v1:
 *   publishAt + schedulerMsgId (global)
 *   → siteWindows[] + schedulerRefs (per-site, mirrors Listing pattern)
 *
 * siteWindows[].startAt  — when the post goes live on that site
 * siteWindows[].endAt    — when the post is hidden on that site (optional: set to far future for "never expires")
 * schedulerRefs          — QStash message IDs keyed by site slug, same shape as Listing.schedulerRefs
 *
 * Backward-compat shim:
 *   publishAt is kept as a virtual / legacy field so old imports don't break,
 *   but it is no longer the source of truth. On save, if publishAt is set
 *   and siteWindows is empty, it is migrated into a global window for all KNOWN_SITES.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES, SiteWindowSchema, ISiteWindow } from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';

export type BlogStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface IAdminNote {
  message: string;
  type: 'status_change' | 'general';
  createdAt: Date;
  createdBy?: string;
}

export interface IBlogPost extends Document {
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string | null | undefined;
  date: Date;
  slug: string;
  order: number;
  status: BlogStatus;

  /**
   * True when at least one siteWindow is currently active (startAt ≤ now ≤ endAt).
   * Managed by the scheduler — do not set manually.
   */
  isActive: boolean;

  /**
   * Per-site publish windows. Each entry is:
   *   { site, startAt, endAt, durationDays }
   *
   * Empty = post is in draft / not yet scheduled.
   * The post becomes visible on a site at startAt and hidden at endAt.
   *
   * The scheduler derives the overall status:
   *   - All windows in the future → 'scheduled'
   *   - At least one window active → 'published'
   *   - All windows ended         → back to 'draft'
   */
  siteWindows: ISiteWindow[];

  /**
   * Derived flat list of site slugs with at least one active/upcoming window.
   * Kept for backward-compat queries and site-filter logic.
   * Synced automatically from siteWindows on save.
   */
  visibleOnSites: string[];

  /**
   * QStash message IDs keyed by site slug.
   * Shape: { [site: string]: ISchedulerRef }
   *   schedulerRefs['new-jobs-fawn.vercel.app'] = {
   *     startMsgId:  'msg_abc',   // fires at siteWindows[i].startAt
   *     expiryMsgId: 'msg_xyz',   // fires at siteWindows[i].endAt
   *   }
   *
   * Rules (same as Listing):
   *   - startMsgId is only present while the window hasn't started.
   *   - expiryMsgId is present until the window ends.
   *   - Site key removed entirely when window is deleted.
   *   - Never set manually — always go through blogScheduler helpers.
   */
  schedulerRefs: Record<string, ISchedulerRef>;

  /**
   * Legacy field — kept for import backward-compat only.
   * If set when siteWindows is empty, the pre-save hook migrates it.
   * @deprecated Use siteWindows instead.
   */
  publishAt?: Date;

  adminNotes: IAdminNote[];
  createdAt: Date;
  updatedAt: Date;
}

const AdminNoteSchema = new Schema<IAdminNote>(
  {
    message: { type: String, required: true },
    type: { type: String, enum: ['status_change', 'general'], required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String },
  },
  { _id: false },
);

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String },
    date: { type: Date, required: true, default: Date.now },
    slug: { type: String, required: true, unique: true },
    order: { type: Number, required: true, index: true },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isActive: { type: Boolean, default: false, index: true },

    // ── Per-site windows ─────────────────────────────────────
    // Reuses the same SiteWindowSchema as Listing for consistency.
    siteWindows: { type: [SiteWindowSchema], default: [] },

    // Derived flat list — synced in pre-save
    visibleOnSites: { type: [String], default: [] },

    // QStash refs — Mixed object keyed by site slug
    schedulerRefs: { type: Schema.Types.Mixed, default: {} },

    // ── Legacy field (kept for import compat) ─────────────────
    publishAt: { type: Date },

    adminNotes: { type: [AdminNoteSchema], default: [] },
  },
  { timestamps: true },
);

// ─── Pre-save hook ────────────────────────────────────────────
// 1. If legacy publishAt is set and siteWindows is empty, migrate it to
//    a global window (all KNOWN_SITES, publishAt → publishAt + 365 days).
// 2. Validate siteWindows ordering.
// 3. Sync visibleOnSites from siteWindows.
// 4. Ensure schedulerRefs is never undefined.

BlogPostSchema.pre('save', function () {
  // ── Legacy migration ──────────────────────────────────────
  if (this.publishAt && (!this.siteWindows || this.siteWindows.length === 0)) {
    const startAt = this.publishAt;
    const endAt = new Date(startAt.getTime() + 365 * 24 * 60 * 60 * 1000); // +1 year
    this.siteWindows = KNOWN_SITES.map(site => ({
      site,
      startAt,
      endAt,
      durationDays: 365,
    })) as ISiteWindow[];
    // Clear legacy field — it's now in siteWindows
    this.publishAt = undefined;
  }

  // ── Validate + compute durationDays ──────────────────────
  if (this.siteWindows?.length) {
    const { daysBetween } = require('@/modal/sharedListing');
    for (const w of this.siteWindows) {
      const start = w.startAt instanceof Date ? w.startAt : new Date(w.startAt);
      const end = w.endAt instanceof Date ? w.endAt : new Date(w.endAt);
      if (end <= start) {
        throw new Error(`siteWindow for blog "${w.site}": endAt must be after startAt`);
      }
      w.durationDays = daysBetween(start, end);
    }

    // Sync visibleOnSites
    this.visibleOnSites = [...new Set(this.siteWindows.map(w => w.site))];
  } else {
    this.visibleOnSites = [];
  }

  // ── Guard schedulerRefs ───────────────────────────────────
  if (!this.schedulerRefs) {
    this.schedulerRefs = {};
  }
});

export default mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);