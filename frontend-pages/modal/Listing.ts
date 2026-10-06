
import mongoose, { Schema, Document } from 'mongoose';
import {
  IAdminNote,
  ISchedulerRef,
  ISlot,
  ISiteWindow,
  AdminNoteSchema,
  SlotSchema,
  SiteWindowSchema,
  generateJobId,
  daysBetween,
} from './sharedListing';

export type { IAdminNote, ISchedulerRef, ISlot, ISiteWindow };

export interface IListing extends Document {
  // ── Identity ──────────────────────────────────────────────
  title: string;
  companyName: string;
  slug: string;
  overview: string;
  description: string;
  applyEmail: string;
  highlights: string[];
  benefits: string[];
  categories?: string[];
  jobBankId: string;

  // ── Job meta ──────────────────────────────────────────────
  jobMode: string;
  jobType?: string;
  /**
   * Human-readable unique identifier.
   * Auto-generated on create if not supplied.
   * Format: JOB-<YEAR>-<8 chars>  e.g. JOB-2025-K3X9PQ7R
   */
  jobId: string;

  // ── Slots ─────────────────────────────────────────────────
  slots: ISlot[];

  // ── Visibility ────────────────────────────────────────────
  /**
   * Flat list of site slugs derived from siteWindows[].site on save.
   * Kept for backward-compat with existing queries/indexes.
   */
  visibleOnSites: string[];

  /**
   * Per-site schedule. durationDays is stored on write.
   */
  siteWindows: ISiteWindow[];

  // ── Scheduler refs ────────────────────────────────────────
  /**
   * QStash message IDs keyed by site slug.
   * Used to cancel/replace scheduled jobs when site windows change.
   *
   * Shape: { [site: string]: ISchedulerRef }
   * e.g.  { 'new-jobs-fawn.vercel.app': { expiryMsgId: 'msg_abc' } }
   *
   * Notes:
   *  - startMsgId is only present for windows that haven't started yet
   *    (a live listing normally has no pending start triggers, but a
   *    window added in the future to an already-live listing will have one).
   *  - expiryMsgId is present for every active window until it fires.
   *  - The site key is removed entirely when a window is deleted.
   */
  schedulerRefs: Record<string, ISchedulerRef>;

  // ── Workflow ──────────────────────────────────────────────
  status: 'pending' | 'scheduled' | 'approved' | 'rejected';
  isActive: boolean;

  // ── Ownership ─────────────────────────────────────────────
  submittedBy: string;

  // ── Admin history ─────────────────────────────────────────
  adminNotes: IAdminNote[];

  // ── Update request flow ───────────────────────────────────
  updateRequested: boolean;
  updateRequestData?: any;

  // ── Timestamps ────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    // ── Identity ────────────────────────────────────────────
    title: { type: String, required: true },
    companyName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    overview: { type: String, required: true },
    description: { type: String, required: true },
    applyEmail: { type: String, required: true },
    highlights: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    jobBankId: { type: String, default: '', required: true },

    // ── Job meta ────────────────────────────────────────────
    jobMode: { type: String, required: true },
    jobType: { type: String },
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ── Slots ───────────────────────────────────────────────
    slots: { type: [SlotSchema], default: [] },

    // ── Visibility ──────────────────────────────────────────
    visibleOnSites: { type: [String], default: [] },
    siteWindows: { type: [SiteWindowSchema], default: [] },

    // ── Scheduler refs ──────────────────────────────────────
    // Mixed object: { [siteSlug]: { startMsgId?, expiryMsgId? } }
    // Never set this manually — always go through the scheduler helpers.
    schedulerRefs: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // ── Workflow ────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'approved', 'rejected'],
      required: true,
      default: 'pending',
      index: true,
    },
    isActive: { type: Boolean, default: true },

    // ── Ownership ───────────────────────────────────────────
    submittedBy: { type: String, required: true, index: true },

    // ── Admin ───────────────────────────────────────────────
    adminNotes: { type: [AdminNoteSchema], default: [] },
    updateRequested: { type: Boolean, default: false },
    updateRequestData: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// ─── Auto-generate jobId + sync siteWindows ───────────────────
ListingSchema.pre('save', async function () {
  if (!this.jobId) {
    let candidate: string;
    let attempts = 0;
    do {
      candidate = generateJobId();
      // eslint-disable-next-line no-await-in-loop
      const clash = await (this.constructor as any).findOne({ jobId: candidate }).lean();
      if (!clash) break;
      attempts++;
    } while (attempts < 5);
    this.jobId = candidate!;
  }

  if (this.siteWindows?.length) {
    for (const w of this.siteWindows) {
      if (w.endAt <= w.startAt) {
        throw new Error(`siteWindow for "${w.site}": endAt must be after startAt`);
      }
      w.durationDays = daysBetween(w.startAt, w.endAt);
    }
    this.visibleOnSites = [...new Set(this.siteWindows.map(w => w.site))];
  }

  // Ensure schedulerRefs is never undefined (Mixed fields can lose their
  // default when a document is loaded and re-saved without touching that field)
  if (!this.schedulerRefs) {
    this.schedulerRefs = {};
  }
});

export default mongoose.models.Listing ||
  mongoose.model<IListing>('Listing', ListingSchema);