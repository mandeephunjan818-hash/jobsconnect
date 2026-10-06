/**
 * Listingscheduler.ts
 *
 * Two-layer scheduling system:
 *
 * Layer 1 — Draft → Live  (start triggers)
 *   Fires at the earliest siteWindow.startAt across all windows.
 *   Promotes the draft to a live Listing.
 *   After promotion, start triggers are done; expiry triggers take over.
 *
 * Layer 2 — Site window expiry  (expiry triggers)
 *   One trigger per site window, fires at siteWindow.endAt.
 *   Removes that site from the live listing.
 *   If no windows remain, moves the listing back to draft.
 *
 * QStash is the durable path (Vercel Hobby compatible).
 * setTimeout is the local-dev / warm-process fallback.
 *
 * QStash's plan has a maxDelay of 604800s (7 days) per publish. Since our
 * windows can be months out, every QStash job is capped at
 * QSTASH_MAX_DELAY_SECONDS and carries a `targetAt` in its body — the REAL
 * time the action is due. When a job fires, the receiving route checks
 * targetAt against "now": if it's not due yet, this was just a checkpoint
 * and we re-arm another capped job for the remainder; if it IS due, we run
 * the real action. This repeats every ~7 days until the real time arrives.
 *
 * QStash message IDs are stored in listing.schedulerRefs so that
 * jobs can be cancelled when schedules change:
 *   schedulerRefs[site].startMsgId  — pending start trigger (or checkpoint)
 *   schedulerRefs[site].expiryMsgId — pending expiry trigger (or checkpoint)
 *
 * No step in this system waits on admin approval — everything created
 * or updated goes live (or is scheduled to go live) immediately.
 */

import { Client } from '@upstash/qstash';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import type { ISchedulerRef } from '@/modal/sharedListing';
import { notifySubscribersForSites, type ListingSnapshot } from '@/lib/notifySubscribers';
import { normalizeSiteWindows, daysBetween, deriveCampaignWindow } from '@/modal/sharedListing';

// ─────────────────────────────────────────────────────────────
// Ensure every window has a real endAt. If missing/invalid,
// default to startAt + 6 months.
//
// IMPORTANT: `w` may be a Mongoose subdocument. Never spread it
// directly ({...w}) — Mongoose getter-backed paths don't reliably
// survive a spread, which silently produces `site: undefined`.
// Always pull fields off explicitly instead.
// ─────────────────────────────────────────────────────────────
function withFallbackExpiry<T extends { site: string; startAt: Date; endAt?: Date }>(
  w: T,
): { site: string; startAt: Date; endAt: Date; durationDays: number } {
  const site = w.site;
  const startAt = new Date(w.startAt);
  const validEnd = w.endAt && !isNaN(new Date(w.endAt).getTime());

  if (validEnd) {
    const endAt = new Date(w.endAt as Date);
    return { site, startAt, endAt, durationDays: daysBetween(startAt, endAt) };
  }

  const fallbackEnd = new Date(startAt);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + 6);
  console.warn(`[Scheduler] site="${site}" had no valid endAt — defaulting to 6 months from startAt`);
  return { site, startAt, endAt: fallbackEnd, durationDays: daysBetween(startAt, fallbackEnd) };
}

// ─────────────────────────────────────────────────────────────
// Constants & clients
// ─────────────────────────────────────────────────────────────

// In-memory timers — only reliable in long-running Node (local dev).
// On Vercel serverless these are best-effort; QStash is the durable path.
export const timers = new Map<string, ReturnType<typeof setTimeout>>();

const qstash = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const MAX_SAFE_DELAY = 24 * 60 * 60 * 1000; // 24 h — Node setTimeout cap

// QStash plan cap is 604800s (7 days). Stay safely under it so we never
// hit "maxDelay exceeded" even with clock drift.
const QSTASH_MAX_DELAY_SECONDS = 590000;

// ─────────────────────────────────────────────────────────────
// QStash cancel helper
// ─────────────────────────────────────────────────────────────

/**
 * Cancel a single QStash message by ID.
 * Silently no-ops if the message ID is missing or QStash is not configured.
 */
async function cancelQStashMessage(msgId: string | undefined): Promise<void> {
  if (!qstash || !msgId) return;
  try {
    await qstash.messages.delete(msgId);
    console.log(`[QStash] Cancelled message ${msgId}`);
  } catch (err: any) {
    // 404 means the message already fired or was already cancelled — that's fine.
    if (err?.status !== 404) {
      console.error(`[QStash] Failed to cancel message ${msgId}:`, err);
    }
  }
}

/**
 * Cancel ALL QStash triggers (start + expiry) for every site in a
 * schedulerRefs map.  Safe to call with an empty or undefined map.
 */
async function cancelAllQStashRefs(
  refs: Record<string, ISchedulerRef> | undefined,
): Promise<void> {
  if (!refs) return;
  await Promise.all(
    Object.values(refs).flatMap(ref => [
      cancelQStashMessage(ref.startMsgId),
      cancelQStashMessage(ref.expiryMsgId),
    ]),
  );
}

/**
 * Cancel QStash triggers for a specific site only.
 */
async function cancelQStashRefsForSite(
  refs: Record<string, ISchedulerRef> | undefined,
  site: string,
): Promise<void> {
  if (!refs?.[site]) return;
  await Promise.all([
    cancelQStashMessage(refs[site].startMsgId),
    cancelQStashMessage(refs[site].expiryMsgId),
  ]);
}

// ─────────────────────────────────────────────────────────────
// In-memory timer helpers
// ─────────────────────────────────────────────────────────────

export function cancelScheduledDraft(id: string): void {
  const handle = timers.get(id);
  if (handle) {
    clearTimeout(handle);
    timers.delete(id);
    console.log(`[Scheduler] Timer cancelled for ${id}`);
  }
}

export function cancelExpiryTimersForSlug(slug: string): void {
  for (const key of timers.keys()) {
    if (key.startsWith(`expiry:${slug}:`)) {
      clearTimeout(timers.get(key)!);
      timers.delete(key);
    }
  }
}

export function cancelStartTimersForSlug(slug: string): void {
  for (const key of timers.keys()) {
    if (key.startsWith(`start:${slug}:`)) {
      clearTimeout(timers.get(key)!);
      timers.delete(key);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Revalidation helper
// ─────────────────────────────────────────────────────────────

async function revalidateListing(slug: string, listingId?: string): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    if (listingId) {
      revalidatePath(`/dashboard/listings/${listingId}`);
      revalidatePath(`/listing/${listingId}`);
    }
    await fetch(`${BASE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${slug}`] }),
    });
  } catch (err) {
    console.error(`[Scheduler] Revalidation failed for slug="${slug}":`, err);
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Draft → Live promotion
//
// Exported (not just used internally) so both the setTimeout path and
// the QStash checkpoint handler in /api/qstash/publish call the exact
// same logic — no duplicated promotion code living in two places.
// ─────────────────────────────────────────────────────────────

export async function promoteDraftToListing(draftId: string): Promise<void> {
  try {
    await connectToDatabase();

    const draft = await ListingDraft.findById(draftId);
    if (!draft) {
      console.warn(`[Scheduler] Draft ${draftId} not found — skipping`);
      return;
    }
    if (draft.status !== 'scheduled' && draft.status !== 'approved') {
      console.warn(`[Scheduler] Draft ${draftId} status='${draft.status}' — skipping`);
      return;
    }

    // Separate windows into "already started" and "still future"
    const now = new Date();
    const allWindows = normalizeSiteWindows(draft.siteWindows ?? []);

    // Only promote the windows whose startAt has arrived.
    // Windows that are still in the future stay in the draft's schedulerRefs
    // and will get their own start trigger later (rescheduled below).
    const windowsToPromoteRaw = allWindows.filter(w => w.startAt <= now);
    const windowsStillFuture = allWindows.filter(w => w.startAt > now);

    if (windowsToPromoteRaw.length === 0) {
      console.warn(`[Scheduler] Draft ${draftId} — no windows ready to promote yet`);
      return;
    }

    // Guarantee every promoted window has a real endAt — 6-month fallback
    // if it was ever missing or invalid.
    const windowsToPromote = windowsToPromoteRaw.map(withFallbackExpiry);

    // Carry existing schedulerRefs so expiry IDs survive the move
    const existingRefs: Record<string, ISchedulerRef> = draft.schedulerRefs ?? {};

    // Any window being promoted that does NOT already have an expiry job
    // registered gets one now. Without this, listings promoted with no
    // pre-existing expiryMsgId would stay live forever.
    const windowsNeedingExpiry = windowsToPromote.filter(
      w => !existingRefs[w.site]?.expiryMsgId,
    );

    let freshExpiryMsgIds: Record<string, string> = {};
    if (windowsNeedingExpiry.length > 0) {
      scheduleListingExpiry(
        draft.slug,
        windowsNeedingExpiry.map(w => ({ site: w.site, endAt: w.endAt })),
      );
      freshExpiryMsgIds = await qstashScheduleExpiry(
        draft.slug,
        windowsNeedingExpiry.map(w => ({ site: w.site, endAt: w.endAt })),
      );
      console.log(
        `[Scheduler] Draft ${draftId} — registered missing expiry for: ` +
        windowsNeedingExpiry.map(w => w.site).join(', '),
      );
    }

    // Build the refs for the live listing:
    // - keep/assign expiryMsgId for promoted windows (still needed)
    // - drop startMsgId (already fired)
    const liveRefs: Record<string, ISchedulerRef> = {};
    for (const w of windowsToPromote) {
      liveRefs[w.site] = {
        expiryMsgId: existingRefs[w.site]?.expiryMsgId ?? freshExpiryMsgIds[w.site],
      };
    }

    const payload = {
      title: draft.title,
      companyName: draft.companyName,
      overview: draft.overview,
      highlights: draft.highlights ?? [],
      benefits: draft.benefits ?? [],
      slug: draft.slug,
      jobBankId: draft.jobBankId,
      description: draft.description,
      applyEmail: draft.applyEmail,
      categories: draft.categories ?? [],
      jobMode: draft.jobMode,
      jobType: draft.jobType,
      jobId: draft.jobId,
      slots: draft.slots ?? [],
      visibleOnSites: windowsToPromote.map(w => w.site),
      siteWindows: windowsToPromote,
      schedulerRefs: liveRefs,
      isActive: true,
      submittedBy: draft.submittedBy,
      status: 'approved' as const,
      adminNotes: [
        ...draft.adminNotes,
        {
          message: `Auto-published from scheduled draft at ${now.toISOString()}`,
          type: 'status_change' as const,
          createdAt: now,
          createdBy: 'scheduler',
        },
      ],
      updateRequested: false,
    };

    const promoted = await Listing.findOneAndUpdate(
      { slug: draft.slug },
      { $set: payload },
      { upsert: true, new: true, returnDocument: 'after' },
    );

    console.log(
      `[Scheduler] Draft ${draftId} (${draft.jobId}) promoted → live (slug: ${draft.slug}). ` +
      `Sites promoted: ${windowsToPromote.map(w => w.site).join(', ')}`,
    );

    // ── Notify subscribers for each site that just went live ──
    // Fire-and-forget — do not await so promotion is never delayed by email sending.
    const firstSlot = (draft.slots as any[])?.[0];
    const listingSnapshot: ListingSnapshot = {
      title: draft.title,
      companyName: draft.companyName,
      overview: draft.overview,
      slug: draft.slug,
      jobMode: draft.jobMode,
      jobType: draft.jobType,
      location: firstSlot
        ? `${firstSlot.city}, ${firstSlot.province}`
        : 'Location not specified',
      jobPay: firstSlot?.jobPay,
    };
    notifySubscribersForSites(
      windowsToPromote.map(w => w.site),
      listingSnapshot,
    ).catch(err => console.error('[Scheduler] Subscriber notification failed:', err));

    // If there are still-future windows, keep a trimmed draft for them
    if (windowsStillFuture.length > 0) {
      // Cancel start triggers only for promoted windows (expiry already moved to live listing)
      for (const w of windowsToPromote) {
        delete existingRefs[w.site];
      }

      const fixedFuture = windowsStillFuture.map(withFallbackExpiry);

      draft.siteWindows = fixedFuture as any;
      draft.visibleOnSites = fixedFuture.map(w => w.site);
      draft.schedulerRefs = existingRefs; // only future-window refs remain
      draft.adminNotes.push({
        message:
          `Partial promotion at ${now.toISOString()}: ` +
          `sites [${windowsToPromote.map(w => w.site).join(', ')}] went live. ` +
          `Remaining future windows: [${fixedFuture.map(w => w.site).join(', ')}].`,
        type: 'status_change',
        createdAt: now,
        createdBy: 'scheduler',
      });
      await draft.save();

      // Re-arm the next start trigger for the remaining future windows
      const nextStart = new Date(Math.min(...fixedFuture.map(w => w.startAt.getTime())));
      scheduleListingDraft(draftId, nextStart);
      const nextStartMsgId = await qstashScheduleDraft(draftId, nextStart);
      if (nextStartMsgId) {
        for (const w of fixedFuture) {
          existingRefs[w.site] = { ...existingRefs[w.site], startMsgId: nextStartMsgId };
        }
        draft.schedulerRefs = existingRefs;
        draft.markModified('schedulerRefs');
        await draft.save();
      }

      console.log(
        `[Scheduler] Draft ${draftId} kept for future windows: ` +
        fixedFuture.map(w => w.site).join(', '),
      );
    } else {
      // All windows promoted — delete the draft
      await ListingDraft.findByIdAndDelete(draftId);
      timers.delete(draftId);
    }

    await revalidateListing(draft.slug, promoted?._id?.toString());
  } catch (err) {
    console.error(`[Scheduler] Failed to promote draft ${draftId}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Schedule start trigger (setTimeout path)
// ─────────────────────────────────────────────────────────────

export function scheduleListingDraft(draftId: string, publishAt: Date): void {
  cancelScheduledDraft(draftId);

  const delay = publishAt.getTime() - Date.now();

  if (delay <= 0) {
    console.log(`[Scheduler] Draft ${draftId} is past due — promoting immediately`);
    promoteDraftToListing(draftId);
    return;
  }

  const safeDelay = Math.min(delay, MAX_SAFE_DELAY);

  const handle = setTimeout(() => {
    if (publishAt.getTime() > Date.now()) {
      scheduleListingDraft(draftId, publishAt); // re-enter until real time arrives
    } else {
      promoteDraftToListing(draftId);
    }
  }, safeDelay);

  timers.set(draftId, handle);
  console.log(
    `[Scheduler] Draft ${draftId} scheduled in ${Math.round(safeDelay / 1000)}s ` +
    `at ${publishAt.toISOString()}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Queue start trigger via QStash (durable path)
//
// Capped at QSTASH_MAX_DELAY_SECONDS. The real target time is embedded
// as `targetAt` in the body — /api/qstash/publish checks this and, if
// it's not actually due yet, re-arms another capped checkpoint via
// handleDraftCheckpoint() below. Returns the QStash message ID so it
// can be stored in schedulerRefs.
// ─────────────────────────────────────────────────────────────

export async function qstashScheduleDraft(
  draftId: string,
  publishAt: Date,
): Promise<string | undefined> {
  if (!qstash) return undefined;
  const totalDelaySeconds = Math.max(1, Math.floor((publishAt.getTime() - Date.now()) / 1000));
  const delaySeconds = Math.min(totalDelaySeconds, QSTASH_MAX_DELAY_SECONDS);
  try {
    const res = await qstash.publishJSON({
      url: `${BASE_URL}/api/qstash/publish`,
      delay: delaySeconds,
      body: { draftId, targetAt: publishAt.toISOString() },
    });
    console.log(
      `[QStash] Draft ${draftId} checkpoint queued in ${delaySeconds}s ` +
      `(target: ${publishAt.toISOString()}, msgId: ${res.messageId})`,
    );
    return res.messageId;
  } catch (err) {
    console.error('[QStash] Failed to queue draft publish checkpoint — setTimeout still active', err);
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Draft checkpoint handler
//
// Called by /api/qstash/publish on EVERY wakeup, whether it's the real
// publish time or just a 7-day checkpoint. If targetAt hasn't arrived
// yet, re-arms a fresh checkpoint for the remaining time and returns.
// If it has, runs the actual promotion.
// ─────────────────────────────────────────────────────────────

export async function handleDraftCheckpoint(
  draftId: string,
  targetAt: string | undefined,
): Promise<{ promoted: boolean; rescheduled: boolean }> {
  // No targetAt (e.g. an old/legacy message) — treat as due now.
  if (!targetAt) {
    await promoteDraftToListing(draftId);
    return { promoted: true, rescheduled: false };
  }

  const target = new Date(targetAt);
  if (isNaN(target.getTime())) {
    console.error(`[Scheduler] handleDraftCheckpoint got invalid targetAt="${targetAt}" for draft ${draftId} — treating as due now`);
    await promoteDraftToListing(draftId);
    return { promoted: true, rescheduled: false };
  }

  if (target.getTime() > Date.now()) {
    // Not due yet — this was just a checkpoint. Re-arm for the remainder.
    await qstashScheduleDraft(draftId, target);
    console.log(
      `[Scheduler] Draft ${draftId} checkpoint — not due until ${target.toISOString()}, re-armed`,
    );
    return { promoted: false, rescheduled: true };
  }

  await promoteDraftToListing(draftId);
  return { promoted: true, rescheduled: false };
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Schedule expiry trigger (setTimeout path)
// ─────────────────────────────────────────────────────────────

export function scheduleListingExpiry(
  slug: string,
  siteWindows: Array<{ site: string; endAt: Date }>,
): void {
  for (const w of siteWindows) {
    const timerId = `expiry:${slug}:${w.site}`;
    const existing = timers.get(timerId);
    if (existing) {
      clearTimeout(existing);
      timers.delete(timerId);
    }

    const endAt = new Date(w.endAt);
    const delay = endAt.getTime() - Date.now();

    if (delay <= 0) {
      console.log(
        `[Scheduler] Window slug="${slug}" site="${w.site}" already ended — expiring now`,
      );
      expireListingForSite(slug, w.site);
      continue;
    }

    const safeDelay = Math.min(delay, MAX_SAFE_DELAY);

    const handle = setTimeout(() => {
      if (endAt.getTime() > Date.now()) {
        scheduleListingExpiry(slug, [{ site: w.site, endAt }]); // re-enter
      } else {
        expireListingForSite(slug, w.site);
      }
    }, safeDelay);

    timers.set(timerId, handle);
    console.log(
      `[Scheduler] Expiry set for slug="${slug}" site="${w.site}" ` +
      `in ${Math.round(safeDelay / 1000)}s at ${endAt.toISOString()}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Queue expiry trigger via QStash (durable path)
//
// Capped at QSTASH_MAX_DELAY_SECONDS with `targetAt` embedded — same
// checkpoint pattern as qstashScheduleDraft. Returns a map of
// site → messageId so callers can store in schedulerRefs.
// ─────────────────────────────────────────────────────────────

export async function qstashScheduleExpiry(
  slug: string,
  siteWindows: Array<{ site: string; endAt: Date }>,
): Promise<Record<string, string>> {
  const msgIds: Record<string, string> = {};
  if (!qstash) return msgIds;

  for (const w of siteWindows) {
    const endAt = new Date(w.endAt);
    const totalDelaySeconds = Math.max(1, Math.floor((endAt.getTime() - Date.now()) / 1000));
    const delaySeconds = Math.min(totalDelaySeconds, QSTASH_MAX_DELAY_SECONDS);
    try {
      const res = await qstash.publishJSON({
        url: `${BASE_URL}/api/qstash/expire`,
        delay: delaySeconds,
        body: { slug, site: w.site, targetAt: endAt.toISOString() },
      });
      msgIds[w.site] = res.messageId;
      console.log(
        `[QStash] Expiry checkpoint queued for slug="${slug}" site="${w.site}" ` +
        `in ${delaySeconds}s (target: ${endAt.toISOString()}, msgId: ${res.messageId})`,
      );
    } catch (err) {
      console.error(
        `[QStash] Failed to queue expiry checkpoint for slug="${slug}" site="${w.site}" — ` +
        'setTimeout still active',
        err,
      );
    }
  }

  return msgIds;
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Expiry action
//
// Exported so /api/qstash/expire's checkpoint handler calls this exact
// same logic instead of maintaining a second copy.
// ─────────────────────────────────────────────────────────────

export async function expireListingForSite(slug: string, site: string): Promise<void> {
  try {
    await connectToDatabase();

    const listing = await Listing.findOne({ slug });
    if (!listing) {
      console.warn(`[Scheduler] Listing slug="${slug}" not found for expiry`);
      return;
    }

    const windowStillExists = listing.siteWindows.some((w: any) => w.site === site);
    if (!windowStillExists) {
      console.log(`[Scheduler] slug="${slug}" site="${site}" already removed — no-op`);
      return;
    }

    // Remove the expired window and its scheduler ref
    listing.siteWindows = listing.siteWindows.filter((w: any) => w.site !== site) as any;
    listing.visibleOnSites = [...new Set(listing.siteWindows.map((w: any) => w.site))];

    const refs: Record<string, ISchedulerRef> = listing.schedulerRefs ?? {};
    delete refs[site];
    listing.schedulerRefs = refs;
    listing.markModified('schedulerRefs');

    if (listing.siteWindows.length === 0) {
      // All windows ended — move back to draft
      const draftData = {
        title: listing.title,
        companyName: listing.companyName,
        overview: listing.overview,
        highlights: listing.highlights ?? [],
        benefits: listing.benefits ?? [],
        slug: listing.slug,
        jobBankId: listing.jobBankId,
        description: listing.description,
        applyEmail: listing.applyEmail,
        categories: listing.categories ?? [],
        jobMode: listing.jobMode,
        jobType: listing.jobType,
        jobId: listing.jobId,
        slots: listing.slots ?? [],
        visibleOnSites: [],
        siteWindows: [],
        schedulerRefs: {},
        submittedBy: listing.submittedBy,
        status: 'approved' as const,
        adminNotes: [
          ...listing.adminNotes,
          {
            message: `Auto-expired: all site windows ended at ${new Date().toISOString()}. Moved back to drafts.`,
            type: 'status_change' as const,
            createdAt: new Date(),
            createdBy: 'scheduler',
          },
        ],
        updateRequested: false,
      };

      await ListingDraft.create(draftData);
      await Listing.deleteOne({ _id: listing._id });

      console.log(`[Scheduler] Listing slug="${slug}" fully expired → moved to drafts`);
    } else {
      // Partial expiry — listing stays live, only this site removed
      listing.markModified('siteWindows');
      await listing.save();
      console.log(
        `[Scheduler] Listing slug="${slug}" removed from site="${site}". ` +
        `${listing.siteWindows.length} window(s) remain.`,
      );
    }

    await revalidateListing(slug, listing._id?.toString());
  } catch (err) {
    console.error(`[Scheduler] Failed to expire slug="${slug}" site="${site}":`, err);
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Expiry checkpoint handler
//
// Called by /api/qstash/expire on EVERY wakeup, whether it's the real
// expiry time or just a 7-day checkpoint. If targetAt hasn't arrived
// yet, re-arms a fresh checkpoint. If it has, runs the real expiry.
// ─────────────────────────────────────────────────────────────

export async function handleExpiryCheckpoint(
  slug: string,
  site: string,
  targetAt: string | undefined,
): Promise<{ expired: boolean; rescheduled: boolean }> {
  if (!targetAt) {
    await expireListingForSite(slug, site);
    return { expired: true, rescheduled: false };
  }

  const target = new Date(targetAt);
  if (isNaN(target.getTime())) {
    console.error(`[Scheduler] handleExpiryCheckpoint got invalid targetAt="${targetAt}" for slug="${slug}" site="${site}" — treating as due now`);
    await expireListingForSite(slug, site);
    return { expired: true, rescheduled: false };
  }

  if (target.getTime() > Date.now()) {
    // Not due yet — this was just a 7-day checkpoint. Re-arm for the remainder.
    await qstashScheduleExpiry(slug, [{ site, endAt: target }]);
    console.log(
      `[Scheduler] Expiry checkpoint for slug="${slug}" site="${site}" — ` +
      `not due until ${target.toISOString()}, re-armed`,
    );
    return { expired: false, rescheduled: true };
  }

  await expireListingForSite(slug, site);
  return { expired: true, rescheduled: false };
}

// ─────────────────────────────────────────────────────────────
// reconfigureTriggers
//
// Call this whenever site windows change on an already-live listing
// or draft (self-serve update, admin edit, etc.).
//
// What it does:
//   1. Cancels ALL existing QStash jobs (start + expiry) for the listing.
//   2. Cancels in-memory timers for the same.
//   3. Registers fresh start + expiry triggers for the new window set.
//      Every window is guaranteed a real endAt (6-month fallback if missing).
//   4. Persists the new schedulerRefs to the DB.
//   5. Fires revalidation so the frontend reflects the change immediately.
//
// It does NOT move the listing between collections.  That is the job of
// the promote/expire functions above and of moveLiveListingToDraft /
// upsertFutureDraftForLiveListing below.
//
// Parameters:
//   slugOrId   — the listing's slug (preferred) or MongoDB _id string.
//   collection — 'live' (Listing) or 'draft' (ListingDraft).
//   newWindows — the complete, validated, up-to-date siteWindows array.
// ─────────────────────────────────────────────────────────────

export async function reconfigureTriggers(
  slugOrId: string,
  collection: 'live' | 'draft',
  newWindows: Array<{ site: string; startAt: Date; endAt?: Date }>,
): Promise<void> {
  await connectToDatabase();

  const Model = collection === 'live' ? Listing : ListingDraft;
  const doc = await (Model as any)
    .findOne({ $or: [{ slug: slugOrId }, { _id: slugOrId }] })
    .exec();

  if (!doc) {
    console.warn(`[reconfigureTriggers] Document "${slugOrId}" not found in ${collection}`);
    return;
  }

  const slug: string = doc.slug;
  const oldRefs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};

  // ── Step 1: Cancel all existing QStash jobs ──────────────
  await cancelAllQStashRefs(oldRefs);

  // ── Step 2: Cancel in-memory timers ─────────────────────
  cancelExpiryTimersForSlug(slug);
  cancelStartTimersForSlug(slug);

  if (newWindows.length === 0) {
    // No windows left — clear refs and return.
    // Caller is responsible for deciding whether to move to draft.
    doc.schedulerRefs = {};
    doc.markModified('schedulerRefs');
    await doc.save();
    return;
  }

  // Guarantee every window has a real endAt (6-month fallback if missing/invalid).
  // withFallbackExpiry never spreads `w` — safe even if newWindows contains
  // Mongoose subdocuments.
  const fixedWindows = newWindows.map(withFallbackExpiry);

  // If any endAt/durationDays was corrected, persist it back onto the doc
  const changed = fixedWindows.some((w, i) => {
    const orig = newWindows[i];
    return !orig.endAt || new Date(orig.endAt).getTime() !== w.endAt.getTime();
  });
  if (changed) {
    doc.siteWindows = fixedWindows as any;
    doc.markModified('siteWindows');
  }

  const now = new Date();
  const newRefs: Record<string, ISchedulerRef> = {};

  const windowsAlreadyStarted = fixedWindows.filter(w => w.startAt <= now);
  const windowsFuture = fixedWindows.filter(w => w.startAt > now);

  // ── Step 3a: Pre-register expiry for ALL windows on a draft ──
  // endAt is absolute, so it's safe to register it now regardless of
  // whether the window has started yet. This means expiry is never
  // solely dependent on promotion happening successfully later.
  if (collection === 'draft') {
    const expiryMsgIds = await qstashScheduleExpiry(
      slug,
      fixedWindows.map(w => ({ site: w.site, endAt: w.endAt })),
    );
    scheduleListingExpiry(slug, fixedWindows.map(w => ({ site: w.site, endAt: w.endAt })));
    for (const w of fixedWindows) {
      newRefs[w.site] = { expiryMsgId: expiryMsgIds[w.site] };
    }
  }

  // ── Step 3b: For future windows → register start triggers ─

  if (windowsFuture.length > 0) {
    // Find the earliest start across all future windows to use as the
    // single draft-promotion trigger (one QStash job, not one per site,
    // because promoteDraftToListing handles all ready windows in one pass).
    const earliestStart = new Date(
      Math.min(...windowsFuture.map(w => w.startAt.getTime())),
    );

    if (collection === 'draft') {
      // setTimeout path
      scheduleListingDraft(doc._id.toString(), earliestStart);

      // QStash path — one start job for the batch
      const startMsgId = await qstashScheduleDraft(doc._id.toString(), earliestStart);

      // Store the same startMsgId against every future window site
      // (they all share the single promotion trigger)
      for (const w of windowsFuture) {
        newRefs[w.site] = { ...newRefs[w.site], startMsgId };
      }
    }
    // If collection === 'live' and there are future windows, it means
    // future windows were added to an already-live listing. The caller
    // (e.g. update-request route) is responsible for spinning off a
    // parallel draft via upsertFutureDraftForLiveListing — the scheduler
    // here only handles expiry for the already-active windows below.
  }

  // ── Step 3c: For already-started windows → register expiry (live only) ─
  // (drafts already got their expiry pre-registered in step 3a, and
  // past-due windows on a draft should self-promote immediately)

  if (windowsAlreadyStarted.length > 0) {
    if (collection === 'draft') {
      // Past-due windows on a draft — promote immediately via setTimeout path.
      // Use delay <= 0 so it fires on next tick after this function returns.
      scheduleListingDraft(doc._id.toString(), new Date(Date.now() - 1));
      await qstashScheduleDraft(doc._id.toString(), new Date(Date.now() + 2000));
      // expiry ref for these sites was already set in step 3a — nothing more to do
    } else {
      // collection === 'live' — register expiry triggers
      scheduleListingExpiry(
        slug,
        windowsAlreadyStarted.map(w => ({ site: w.site, endAt: w.endAt })),
      );
      const expiryMsgIds = await qstashScheduleExpiry(
        slug,
        windowsAlreadyStarted.map(w => ({ site: w.site, endAt: w.endAt })),
      );
      for (const w of windowsAlreadyStarted) {
        newRefs[w.site] = { ...newRefs[w.site], expiryMsgId: expiryMsgIds[w.site] };
      }
    }
  }

  // ── Step 4: Persist new refs ─────────────────────────────
  doc.schedulerRefs = newRefs;
  doc.markModified('schedulerRefs');
  await doc.save();

  // ── Step 5: Revalidate ───────────────────────────────────
  await revalidateListing(slug, doc._id.toString());

  console.log(
    `[reconfigureTriggers] slug="${slug}" collection="${collection}" ` +
    `— reconfigured ${Object.keys(newRefs).length} trigger(s).`,
  );
}

// ─────────────────────────────────────────────────────────────
// upsertFutureDraftForLiveListing
//
// Called when a live listing gets a mix of active + future windows
// (e.g. via a self-serve update). Keeps the listing live for the
// active windows and creates/updates a parallel draft to hold the
// future windows until their own start trigger fires.
// ─────────────────────────────────────────────────────────────

export async function upsertFutureDraftForLiveListing(
  liveListing: any,
  futureWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays?: number }>,
  createdBy: string,
): Promise<void> {
  const fixedFuture = futureWindows.map(withFallbackExpiry);
  const earliestFuture = new Date(
    Math.min(...fixedFuture.map(w => w.startAt.getTime())),
  );

  const existingDraft = await ListingDraft.findOne({ slug: liveListing.slug });

  const draftFields = {
    title: liveListing.title,
    companyName: liveListing.companyName,
    overview: liveListing.overview,
    description: liveListing.description,
    applyEmail: liveListing.applyEmail,
    highlights: liveListing.highlights ?? [],
    benefits: liveListing.benefits ?? [],
    categories: liveListing.categories ?? [],
    jobBankId: liveListing.jobBankId ?? '',
    jobMode: liveListing.jobMode,
    jobType: liveListing.jobType,
    jobId: liveListing.jobId,
    slots: liveListing.slots ?? [],
    siteWindows: fixedFuture,
    visibleOnSites: fixedFuture.map(w => w.site),
    campaignWindow: deriveCampaignWindow('Hiring Campaign', fixedFuture),
    submittedBy: liveListing.submittedBy,
    status: 'scheduled' as const,
    adminNotes: [
      {
        message: `Future windows [${fixedFuture.map(w => w.site).join(', ')}] held in draft (${createdBy}).`,
        type: 'status_change' as const,
        createdAt: new Date(),
        createdBy,
      },
    ],
    updateRequested: false,
  };

  let draftId: string;
  if (existingDraft) {
    cancelScheduledDraft(existingDraft._id.toString());
    Object.assign(existingDraft, draftFields);
    existingDraft.schedulerRefs = {};
    await existingDraft.save();
    draftId = existingDraft._id.toString();
  } else {
    const created = await ListingDraft.create({ ...draftFields, slug: liveListing.slug });
    draftId = created._id.toString();
  }

  // Pre-register expiry for the future windows too (absolute endAt)
  const expiryMsgIds = await qstashScheduleExpiry(
    liveListing.slug,
    fixedFuture.map(w => ({ site: w.site, endAt: w.endAt })),
  );
  scheduleListingExpiry(liveListing.slug, fixedFuture.map(w => ({ site: w.site, endAt: w.endAt })));

  scheduleListingDraft(draftId, earliestFuture);
  const startMsgId = await qstashScheduleDraft(draftId, earliestFuture);

  const newRefs: Record<string, ISchedulerRef> = {};
  for (const w of fixedFuture) {
    newRefs[w.site] = { startMsgId, expiryMsgId: expiryMsgIds[w.site] };
  }

  await ListingDraft.findByIdAndUpdate(draftId, { $set: { schedulerRefs: newRefs } });
}

// ─────────────────────────────────────────────────────────────
// moveLiveListingToDraft
//
// Called when a live listing's site windows are updated such that
// NONE of the new windows are active right now (all future, or
// the schedule was cleared entirely). The listing is no longer
// visible on any site, so it moves out of `Listing` and into
// `ListingDraft`, cancelling its old expiry triggers and — if
// there are future windows — registering a fresh start trigger.
// ─────────────────────────────────────────────────────────────

export async function moveLiveListingToDraft(
  listing: any,
  futureWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays?: number }>,
  createdBy: string,
): Promise<any> {
  // Cancel existing expiry timers/QStash jobs for the live listing
  cancelExpiryTimersForSlug(listing.slug);
  cancelStartTimersForSlug(listing.slug);
  await cancelAllQStashRefs(listing.schedulerRefs ?? {});

  const fixedFuture = futureWindows.map(withFallbackExpiry);

  const draftPayload = {
    ...listing.toObject(),
    _id: undefined,
    siteWindows: fixedFuture,
    visibleOnSites: fixedFuture.map(w => w.site),
    schedulerRefs: {},
    status: fixedFuture.length > 0 ? ('scheduled' as const) : ('pending' as const),
    isActive: false,
    updatedAt: new Date(),
    campaignWindow: fixedFuture.length
      ? deriveCampaignWindow('Hiring Campaign', fixedFuture)
      : undefined,
    adminNotes: [
      ...(listing.adminNotes ?? []),
      {
        message: fixedFuture.length > 0
          ? `Moved to draft: all active windows removed, future windows [${fixedFuture.map(w => w.site).join(', ')}] scheduled (${createdBy}).`
          : `Moved to draft: no site windows remain (${createdBy}).`,
        type: 'status_change' as const,
        createdAt: new Date(),
        createdBy,
      },
    ],
  };

  await Listing.deleteOne({ _id: listing._id });
  const newDraft = await ListingDraft.create(draftPayload);

  if (fixedFuture.length > 0) {
    const earliest = new Date(Math.min(...fixedFuture.map(w => w.startAt.getTime())));

    const expiryMsgIds = await qstashScheduleExpiry(
      newDraft.slug,
      fixedFuture.map(w => ({ site: w.site, endAt: w.endAt })),
    );
    scheduleListingExpiry(newDraft.slug, fixedFuture.map(w => ({ site: w.site, endAt: w.endAt })));

    scheduleListingDraft(newDraft._id.toString(), earliest);
    const startMsgId = await qstashScheduleDraft(newDraft._id.toString(), earliest);

    const refsOut: Record<string, ISchedulerRef> = {};
    for (const w of fixedFuture) {
      refsOut[w.site] = { startMsgId, expiryMsgId: expiryMsgIds[w.site] };
    }
    newDraft.schedulerRefs = refsOut;
    await newDraft.save();
  }

  await revalidateListing(newDraft.slug);

  return newDraft;
}

// ─────────────────────────────────────────────────────────────
// Boot — restore timers for scheduled drafts + active listings
//
// Only meaningful in long-running Node (local dev / self-hosted).
// On Vercel, QStash jobs are already queued and fire independently.
// ─────────────────────────────────────────────────────────────

export async function initScheduler(): Promise<void> {
  try {
    await connectToDatabase();

    // ── Restore start triggers for scheduled/approved drafts ──
    const drafts = await ListingDraft.find({
      status: { $in: ['scheduled', 'approved'] },
    }).lean();

    if (drafts.length === 0) {
      console.log('[Scheduler] No scheduled drafts on boot');
    } else {
      console.log(`[Scheduler] Restoring ${drafts.length} scheduled draft(s)`);
      for (const draft of drafts) {
        const id = (draft as any)._id.toString();
        const rawWindows = (draft as any).siteWindows ?? [];
        const windows = normalizeSiteWindows(rawWindows);

        if (windows.length === 0) {
          const cw = (draft as any).campaignWindow;
          if (cw?.startAt) {
            scheduleListingDraft(id, new Date(cw.startAt));
          } else {
            console.warn(`[Scheduler] Draft ${id} (${(draft as any).slug}) has no siteWindows and no campaignWindow — skipping`);
          }
          continue;
        }

        const now = new Date();
        const pastDue = windows.filter(w => w.startAt <= now);
        const future = windows.filter(w => w.startAt > now);

        if (pastDue.length > 0) {
          console.log(`[Scheduler] Draft ${id} has past-due windows — promoting now`);
          promoteDraftToListing(id);
        }

        if (future.length > 0) {
          const earliest = new Date(Math.min(...future.map(w => w.startAt.getTime())));
          scheduleListingDraft(id, earliest);
        }
      }
    }

    // ── Restore expiry timers for active live listings ────────
    const activeListings = await Listing.find({ isActive: true }).lean();
    console.log(
      `[Scheduler] Restoring expiry timers for ${activeListings.length} live listing(s)`,
    );

    for (const listing of activeListings) {
      const windows = normalizeSiteWindows(
        ((listing as any).siteWindows ?? []) as any[],
      );

      if (windows.length === 0) continue;

      const now = new Date();

      for (const w of windows) {
        if (w.endAt <= now) {
          console.log(
            `[Scheduler] Listing slug="${(listing as any).slug}" site="${w.site}" ` +
            'expired during downtime — expiring now',
          );
          expireListingForSite((listing as any).slug, w.site);
        } else {
          scheduleListingExpiry((listing as any).slug, [{ site: w.site, endAt: w.endAt }]);
        }
      }

      const futureWindows = windows.filter(w => w.startAt > now);
      if (futureWindows.length > 0) {
        const futureDraft = await ListingDraft.findOne({
          slug: (listing as any).slug,
        }).lean();
        if (!futureDraft) {
          console.warn(
            `[Scheduler] Live listing slug="${(listing as any).slug}" has future windows ` +
            'but no draft exists — future windows may not start. Consider re-saving.',
          );
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Init failed:', err);
  }
}

export function getScheduledDraftIds(): string[] {
  return Array.from(timers.keys());
}