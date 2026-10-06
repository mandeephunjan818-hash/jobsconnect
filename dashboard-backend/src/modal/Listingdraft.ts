import mongoose, { Schema, Document } from 'mongoose';
import {
  IAdminNote,
  ISchedulerRef,
  ISlot,
  ICampaignWindow,
  ISiteWindow,
  AdminNoteSchema,
  SlotSchema,
  CampaignWindowSchema,
  SiteWindowSchema,
  generateJobId,
  daysBetween,
  deriveCampaignWindow,
} from './sharedListing';

export type DraftStatus = 'pending' | 'scheduled' | 'approved' | 'rejected';

export interface IListingDraft extends Document {
  // ── Identity ──────────────────────────────────────────────
  title: string;
  slug: string;
  companyName: string;
  overview: string;
  description: string;
  applyEmail: string;
  highlights: string[];
  benefits: string[];
  categories?: string[];
  jobBankId?: string;

  // ── Job meta ──────────────────────────────────────────────
  jobMode: string;
  jobType?: string;
  /**
   * Human-readable unique identifier.
   * Auto-generated on create if not supplied.
   * Format: JOB-<YEAR>-<8 chars>  e.g. JOB-2025-K3X9PQ7R
   */
  jobId?: string;

  // ── Slots ─────────────────────────────────────────────────
  slots: ISlot[];

  // ── Visibility ────────────────────────────────────────────
  /**
   * Legacy flat list of site slugs.
   * Derived automatically from siteWindows[].site on save.
   */
  visibleOnSites: string[];

  /**
   * Per-site schedule. durationDays is computed and stored on every save.
   */
  siteWindows: ISiteWindow[];

  // ── Scheduler refs ────────────────────────────────────────
  /**
   * QStash message IDs keyed by site slug.
   * Used to cancel/replace scheduled jobs when site windows change.
   *
   * Shape: { [site: string]: ISchedulerRef }
   * e.g.  { 'new-jobs-fawn.vercel.app': { startMsgId: 'msg_abc', expiryMsgId: 'msg_xyz' } }
   *
   * Notes:
   *  - In a draft, startMsgId is typically set for every window (the
   *    draft hasn't gone live yet so all start triggers are still pending).
   *  - expiryMsgId is set at the same time as startMsgId so it is ready
   *    to go the moment the listing is promoted to live.  If the draft is
   *    rejected or re-scheduled, both IDs are cancelled and replaced.
   *  - The site key is removed entirely when a window is deleted.
   */
  schedulerRefs: Record<string, ISchedulerRef>;

  // ── Ownership ─────────────────────────────────────────────
  submittedBy: string;

  // ── Draft / scheduling ────────────────────────────────────
  status: DraftStatus;

  /**
   * Derived from siteWindows (earliest startAt → latest endAt).
   * Required when status === 'scheduled'.
   */
  campaignWindow?: ICampaignWindow;

  // ── Admin history ─────────────────────────────────────────
  adminNotes: IAdminNote[];

  // ── Update request flow ───────────────────────────────────
  updateRequested: boolean;
  updateRequestData?: any;

  // ── Timestamps ────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

const ListingDraftSchema = new Schema<IListingDraft>(
  {
    title: { type: String, required: true },
    companyName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    overview: { type: String, required: true },
    description: { type: String, required: true },
    applyEmail: { type: String, required: true },
    highlights: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    jobBankId: { type: String, default: ''},
    jobMode: { type: String, required: true },
    jobType: { type: String },
    jobId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs with no jobId during creation race
      index: true,
    },

    slots: { type: [SlotSchema], default: [] },

    visibleOnSites: { type: [String], default: [] },
    siteWindows: { type: [SiteWindowSchema], default: [] },

    // ── Scheduler refs ──────────────────────────────────────
    // Mixed object: { [siteSlug]: { startMsgId?, expiryMsgId? } }
    // Never set this manually — always go through the scheduler helpers.
    schedulerRefs: {
      type: Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      enum: ['pending', 'scheduled', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    campaignWindow: { type: CampaignWindowSchema },

    adminNotes: { type: [AdminNoteSchema], default: [] },
    updateRequested: { type: Boolean, default: false },
    updateRequestData: { type: Schema.Types.Mixed },

    submittedBy: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

// ─── Auto-generate jobId + sync siteWindows ───────────────────
ListingDraftSchema.pre('save', async function () {
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

    if (!this.campaignWindow?.label) {
      const derived = deriveCampaignWindow('Campaign', this.siteWindows);
      if (derived) this.campaignWindow = derived;
    }
  }

  if (this.status === 'scheduled' && !this.campaignWindow && !this.siteWindows?.length) {
    throw new Error(
      'campaignWindow or siteWindows[] is required when status is "scheduled".',
    );
  }

  if (this.campaignWindow && this.campaignWindow.endAt <= this.campaignWindow.startAt) {
    throw new Error('campaignWindow.endAt must be after startAt');
  }

  if (!this.schedulerRefs) {
    this.schedulerRefs = {};
  }
});

export default mongoose.models.ListingDraft ||
  mongoose.model<IListingDraft>('ListingDraft', ListingDraftSchema);