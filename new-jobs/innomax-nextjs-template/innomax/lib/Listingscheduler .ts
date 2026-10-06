/**
 * lib/listingScheduler.ts
 *
 * Promotes scheduled ListingDrafts → live Listings when the
 * earliest siteWindow.startAt fires.
 *
 * Changes from previous version:
 *  - publishAt / campaignWindow.startAt  →  earliest siteWindow.startAt
 *  - siteWindows[] carried across as-is (with durationDays already stored)
 *  - visibleOnSites derived from siteWindows on the draft; copied as-is
 *  - benefits + highlights preserved
 */

import connectToDatabase from './mongooes';
import ListingDraft from '../modal/Listingdraft';
import Listing from '../modal/Listing';

const timers = new Map<string, ReturnType<typeof setTimeout>>();

// ─────────────────────────────────────────────────────────────
// Core: promote a single draft to a live listing
// ─────────────────────────────────────────────────────────────
async function promoteDraftToListing(draftId: string): Promise<void> {
  try {
    await connectToDatabase();

    const draft = await ListingDraft.findById(draftId);
    if (!draft) {
      console.warn(`[Scheduler] Draft ${draftId} not found — skipping`);
      return;
    }
    if (draft.status !== 'scheduled') {
      console.warn(
        `[Scheduler] Draft ${draftId} status is '${draft.status}', expected 'scheduled' — skipping`,
      );
      return;
    }

    const payload = {
      // ── Identity ──────────────────────────────────────────
      title: draft.title,
      overview: draft.overview,
      highlights: draft.highlights ?? [],
      benefits: draft.benefits ?? [],
      slug: draft.slug,

      // ── Job meta ──────────────────────────────────────────
      jobMode: draft.jobMode,
      jobType: draft.jobType,
      jobId: draft.jobId,   // preserve the generated ID

      // ── Slots (location / shifts / pay) ───────────────────
      slots: draft.slots ?? [],

      // ── Visibility (flat list + per-site windows) ─────────
      visibleOnSites: draft.visibleOnSites ?? [],
      siteWindows: draft.siteWindows ?? [],

      isActive: true,

      // ── Ownership + workflow ──────────────────────────────
      submittedBy: draft.submittedBy,
      status: 'approved' as const,

      adminNotes: [
        ...draft.adminNotes,
        {
          message: `Auto-published from scheduled draft at ${new Date().toISOString()}`,
          type: 'status_change' as const,
          createdAt: new Date(),
          createdBy: 'scheduler',
        },
      ],
      updateRequested: false,
    };

    await Listing.findOneAndUpdate(
      { slug: draft.slug },
      { $set: payload },
      { upsert: true, new: true },
    );

    // Delete draft once live
    await ListingDraft.findByIdAndDelete(draftId);
    timers.delete(draftId);

    console.log(
      `[Scheduler] Draft ${draftId} (${draft.jobId}) promoted → live listing (slug: ${draft.slug})`,
    );
  } catch (err) {
    console.error(`[Scheduler] Failed to promote draft ${draftId}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────
// Public: schedule a draft to publish at publishAt
// Pass the earliest siteWindow.startAt (or campaignWindow.startAt)
// ─────────────────────────────────────────────────────────────
export function scheduleListingDraft(draftId: string, publishAt: Date): void {
  cancelScheduledDraft(draftId);

  const delay = publishAt.getTime() - Date.now();

  if (delay <= 0) {
    console.log(`[Scheduler] Draft ${draftId} is past due — promoting immediately`);
    promoteDraftToListing(draftId);
    return;
  }

  // Node's setTimeout cap — reschedule automatically for very long windows
  const MAX_SAFE_DELAY = 24 * 60 * 60 * 1000; // 24 h
  const safeDelay = Math.min(delay, MAX_SAFE_DELAY);

  const handle = setTimeout(() => {
    if (delay > MAX_SAFE_DELAY) {
      // Not yet time — re-enter scheduler
      scheduleListingDraft(draftId, publishAt);
    } else {
      promoteDraftToListing(draftId);
    }
  }, safeDelay);

  timers.set(draftId, handle);

  console.log(
    `[Scheduler] Draft ${draftId} will publish in ` +
    `${Math.round(safeDelay / 1000)}s at ${publishAt.toISOString()}`,
  );
}

export function cancelScheduledDraft(draftId: string): void {
  const handle = timers.get(draftId);
  if (handle) {
    clearTimeout(handle);
    timers.delete(draftId);
    console.log(`[Scheduler] Timer cancelled for draft ${draftId}`);
  }
}

// ─────────────────────────────────────────────────────────────
// On server boot: restore timers for all still-scheduled drafts
// Uses earliest siteWindow.startAt; falls back to campaignWindow.startAt
// ─────────────────────────────────────────────────────────────
export async function initScheduler(): Promise<void> {
  try {
    await connectToDatabase();

    const scheduled = await ListingDraft.find({ status: 'scheduled' }).lean();

    if (scheduled.length === 0) {
      console.log('[Scheduler] No scheduled drafts on boot');
      return;
    }

    console.log(`[Scheduler] Restoring ${scheduled.length} scheduled draft(s) on boot`);

    for (const draft of scheduled) {
      const id = (draft as any)._id.toString();

      // Prefer earliest siteWindow.startAt; fall back to campaignWindow.startAt
      const siteWindows: Array<{ startAt: Date }> = (draft as any).siteWindows ?? [];
      let startAt: Date | undefined;

      if (siteWindows.length) {
        startAt = new Date(Math.min(...siteWindows.map(w => new Date(w.startAt).getTime())));
      } else {
        startAt = (draft as any).campaignWindow?.startAt as Date | undefined;
      }

      if (startAt) {
        scheduleListingDraft(id, startAt);
      } else {
        console.warn(`[Scheduler] Draft ${id} has no startAt — skipping timer`);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Init failed:', err);
  }
}

export function getScheduledDraftIds(): string[] {
  return Array.from(timers.keys());
}