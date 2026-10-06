/**
 * app/api/admin/listings/[id]/route.ts
 *
 * Admin CRUD for individual listings (draft or live).
 *
 * Key design rules enforced here:
 *
 *  1. "Draft" = not visible on even one site, or not yet approved.
 *     "Live"  = visible on ≥ 1 site right now.
 *     Moving between collections is driven by site-window activity,
 *     NOT by the admin clicking approve/reject alone.
 *
 *  2. When site windows change on an already-live listing we call
 *     reconfigureTriggers() instead of moving the listing to draft.
 *     The listing stays live for every site that is still active.
 *     Only if ALL active windows are removed does it move to draft.
 *
 *  3. When site windows change on a draft we call reconfigureTriggers()
 *     to cancel/replace the existing QStash start + expiry jobs.
 *
 *  4. The update-request flow follows the same rules:
 *     - If the incoming update only touches non-scheduling fields →
 *       apply directly, no collection move.
 *     - If the incoming update changes siteWindows on a live listing →
 *       reconfigure triggers, stay live for still-active sites.
 *     - If the incoming update changes siteWindows and ALL current
 *       windows are in the future → the listing is invisible right now,
 *       so move to draft and schedule start triggers.
 *
 *  5. Admin-create goes directly to draft with status='approved'.
 *     The scheduler promotes it when its first site window opens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import {
  KNOWN_SITES,
  daysBetween,
  deriveCampaignWindow,
  normalizeSiteWindows,
} from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';
import {
  scheduleListingDraft,
  cancelScheduledDraft,
  qstashScheduleDraft,
  qstashScheduleExpiry,
  scheduleListingExpiry,
  reconfigureTriggers,
  cancelExpiryTimersForSlug,
  timers,
} from '@/lib/Listingscheduler ';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';

interface Params { params: Promise<{ id: string }> }

// ─── Serializers ──────────────────────────────────────────────

function serializeSlots(slots: any[] = []) {
  return slots.map(s => ({
    _id: s._id?.toString(),
    location: s.location,
    province: s.province,
    city: s.city,
    jobPay: s.jobPay,
    jobVacancy: s.jobVacancy ?? null,
    jobStartingTime: s.jobStartingTime ?? null,
    isActive: s.isActive,
    shifts: (s.shifts ?? []).map((sh: any) => ({
      label: sh.label,
      startTime: sh.startTime ?? null,
      endTime: sh.endTime ?? null,
      days: sh.days ?? [],
    })),
  }));
}

function serializeSiteWindows(windows: any[] = []) {
  return windows.map(w => ({
    site: w.site,
    startAt: w.startAt instanceof Date ? w.startAt.toISOString() : w.startAt,
    endAt: w.endAt instanceof Date ? w.endAt.toISOString() : w.endAt,
    durationDays: w.durationDays,
  }));
}

/** Cancel all expiry timers whose key starts with expiry:<slug>: */
function cancelExpiryTimersBySlug(slug: string) {
  for (const key of timers.keys()) {
    if (key.startsWith(`expiry:${slug}:`)) {
      clearTimeout(timers.get(key)!);
      timers.delete(key);
    }
  }
}

// ─── Shared revalidation helper ───────────────────────────────

async function revalidate(slug: string, id?: string) {
  if (id) {
    revalidatePath(`/dashboard/listings/${id}`);
    revalidatePath(`/listing/${id}`);
  }
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
    },
    body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${slug}`] }),
  }).catch(err => console.error('[revalidate] fetch failed:', err));
}

// ─── Validate + normalise an incoming siteWindows array ───────

function parseSiteWindows(
  raw: any[],
): { ok: true; windows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> }
  | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'siteWindows must be an array' };
  const out: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];
  for (const [i, w] of raw.entries()) {
    if (!KNOWN_SITES.includes(w.site))
      return { ok: false, error: `siteWindows[${i}].site "${w.site}" is not a known site` };
    const startAt = new Date(w.startAt);
    const endAt = new Date(w.endAt);
    if (isNaN(startAt.getTime())) return { ok: false, error: `siteWindows[${i}].startAt invalid` };
    if (isNaN(endAt.getTime())) return { ok: false, error: `siteWindows[${i}].endAt invalid` };
    if (endAt <= startAt) return { ok: false, error: `siteWindows[${i}].endAt must be after startAt` };
    out.push({ site: w.site, startAt, endAt, durationDays: daysBetween(startAt, endAt) });
  }
  return { ok: true, windows: out };
}

// ─────────────────────────────────────────────────────────────
// GET — single listing
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const table = req.nextUrl.searchParams.get('table') === 'live' ? 'live' : 'drafts';
    const Model = table === 'live' ? Listing : ListingDraft;

    const doc = await (Model as any).findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const d = doc as any;
    const base = {
      id: d._id.toString(),
      title: d.title,
      companyName: d.companyName,
      overview: d.overview ?? '',
      description: d.description,
      applyEmail: d.applyEmail,
      highlights: d.highlights ?? [],
      benefits: d.benefits ?? [],
      categories: d.categories ?? [],
      jobBankId: d.jobBankId ?? '',
      slug: d.slug,
      jobMode: d.jobMode,
      jobType: d.jobType ?? null,
      jobId: d.jobId ?? null,
      slots: serializeSlots(d.slots),
      visibleOnSites: d.visibleOnSites ?? [],
      siteWindows: serializeSiteWindows(d.siteWindows),
      submittedBy: d.submittedBy,
      status: d.status,
      updateRequested: d.updateRequested,
      updateRequestData: d.updateRequestData ?? null,
      adminNotes: d.adminNotes ?? [],
      createdAt: d.createdAt?.toISOString(),
      updatedAt: d.updatedAt?.toISOString(),
    };

    if (table === 'live') {
      return NextResponse.json({ data: { ...base, isActive: d.isActive } });
    }

    return NextResponse.json({
      data: {
        ...base,
        campaignWindow: d.campaignWindow
          ? {
            label: d.campaignWindow.label,
            startAt: d.campaignWindow.startAt instanceof Date
              ? d.campaignWindow.startAt.toISOString()
              : d.campaignWindow.startAt,
            endAt: d.campaignWindow.endAt instanceof Date
              ? d.campaignWindow.endAt.toISOString()
              : d.campaignWindow.endAt,
          }
          : null,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/listings/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// PUT — status changes, approve/reject, update-request review
// ─────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const adminEmail = session?.user?.email || 'admin';

    const { id } = await params;
    const body = await req.json();

    const {
      table = 'drafts',
      action,
      adminNotes,
      rejectionNotes,
      siteWindows: rawSiteWindows,
      campaignWindow: rawCampaignWindow,
      status,
      isActive,
    } = body;

    const Model = table === 'live' ? Listing : ListingDraft;
    const isObjectId = isValidObjectId(id);
    const doc = isObjectId
      ? await (Model as any).findById(id)
      : await (Model as any).findOne({ slug: id });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    console.log(id);

    const pushNote = (
      message: string,
      type: 'status_change' | 'update_request' | 'update_rejection' | 'general',
    ) => doc.adminNotes.push({ message, type, createdAt: new Date(), createdBy: adminEmail });

    // ══════════════════════════════════════════════════════
    // ACTION: approve draft → publish immediately or schedule
    // ══════════════════════════════════════════════════════
    if (action === 'approve' && table === 'drafts') {

      // Resolve the scheduling intent from the request
      let resolvedWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];
      let resolvedCampaignWindow: { label: string; startAt: Date; endAt: Date } | null = null;

      if (Array.isArray(rawSiteWindows) && rawSiteWindows.length > 0) {
        const parsed = parseSiteWindows(rawSiteWindows);
        if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
        resolvedWindows = parsed.windows;
        const label = rawCampaignWindow?.label ?? doc.campaignWindow?.label ?? 'Hiring Campaign';
        resolvedCampaignWindow = deriveCampaignWindow(label, resolvedWindows) ?? null;
      } else if (doc.siteWindows?.length) {
        // No override — use whatever the draft already has
        resolvedWindows = normalizeSiteWindows(doc.siteWindows);
        const label = rawCampaignWindow?.label ?? doc.campaignWindow?.label ?? 'Hiring Campaign';
        resolvedCampaignWindow = deriveCampaignWindow(label, resolvedWindows) ?? null;
      } else if (rawCampaignWindow?.startAt) {
        const startAt = new Date(rawCampaignWindow.startAt);
        const endAt = new Date(rawCampaignWindow.endAt);
        if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt)
          return NextResponse.json({ error: 'Invalid campaignWindow dates' }, { status: 400 });
        resolvedCampaignWindow = { label: rawCampaignWindow.label ?? 'Hiring Campaign', startAt, endAt };
      }

      const now = new Date();
      const windowsAlreadyActive = resolvedWindows.filter(w => w.startAt <= now);
      const windowsFuture = resolvedWindows.filter(w => w.startAt > now);

      // ── Case A: at least one window is already active → publish immediately ──
      if (windowsAlreadyActive.length > 0) {
        const effectiveVisibleOnSites = [...new Set(windowsAlreadyActive.map(w => w.site))];

        // Schedule expiry for each active window
        scheduleListingExpiry(
          doc.slug,
          windowsAlreadyActive.map(w => ({ site: w.site, endAt: w.endAt })),
        );
        const expiryMsgIds = await qstashScheduleExpiry(
          doc.slug,
          windowsAlreadyActive.map(w => ({ site: w.site, endAt: w.endAt })),
        );

        const liveRefs: Record<string, ISchedulerRef> = {};
        for (const w of windowsAlreadyActive) {
          liveRefs[w.site] = { expiryMsgId: expiryMsgIds[w.site] };
        }

        const listingPayload = {
          title: doc.title,
          companyName: doc.companyName,
          overview: doc.overview,
          description: doc.description,
          applyEmail: doc.applyEmail,
          highlights: doc.highlights ?? [],
          benefits: doc.benefits ?? [],
          categories: doc.categories ?? [],
          slug: doc.slug,
          jobBankId: doc.jobBankId ?? '',
          jobMode: doc.jobMode,
          jobType: doc.jobType,
          jobId: doc.jobId,
          slots: doc.slots ?? [],
          visibleOnSites: effectiveVisibleOnSites,
          siteWindows: windowsAlreadyActive,
          schedulerRefs: liveRefs,
          submittedBy: doc.submittedBy,
          isActive: true,
          status: 'approved' as const,
          adminNotes: [
            ...doc.adminNotes,
            {
              message: `Approved and published immediately. ${adminNotes || ''}`.trim(),
              type: 'status_change',
              createdAt: new Date(),
              createdBy: adminEmail,
            },
          ],
          updateRequested: false,
        };

        const listing = await Listing.findOneAndUpdate(
          { slug: doc.slug },
          { $set: listingPayload },
          { upsert: true, new: true },
        );

        // If there are also future windows, keep them in a draft
        if (windowsFuture.length > 0) {
          const futureRefs: Record<string, ISchedulerRef> = {};
          const earliestFuture = new Date(
            Math.min(...windowsFuture.map(w => w.startAt.getTime())),
          );

          // Cancel any old draft start triggers first
          cancelScheduledDraft(id);
          scheduleListingDraft(id, earliestFuture);
          const startMsgId = await qstashScheduleDraft(id, earliestFuture);
          for (const w of windowsFuture) {
            futureRefs[w.site] = { startMsgId };
          }

          doc.siteWindows = windowsFuture as any;
          doc.visibleOnSites = windowsFuture.map(w => w.site);
          doc.schedulerRefs = futureRefs;
          doc.status = 'scheduled';
          doc.campaignWindow = deriveCampaignWindow(
            resolvedCampaignWindow?.label ?? 'Hiring Campaign',
            windowsFuture,
          );
          pushNote(
            `Partially approved: [${windowsAlreadyActive.map(w => w.site).join(', ')}] published now. ` +
            `Future windows [${windowsFuture.map(w => w.site).join(', ')}] remain scheduled.`,
            'status_change',
          );
          await doc.save();
        } else {
          await ListingDraft.findByIdAndDelete(id);
        }

        await revalidate(doc.slug, listing._id.toString());
        return NextResponse.json({ published: true, slug: doc.slug, jobId: doc.jobId });
      }

      // ── Case B: all windows are in the future → schedule the draft ──
      if (windowsFuture.length > 0) {
        const earliestStart = new Date(
          Math.min(...windowsFuture.map(w => w.startAt.getTime())),
        );

        // Cancel any existing start trigger first
        cancelScheduledDraft(id);
        const oldRefs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};
        for (const ref of Object.values(oldRefs)) {
          if (ref.startMsgId) {
            // fire-and-forget cancel
            import('@upstash/qstash').then(({ Client }) => {
              const c = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;
              c?.messages.delete(ref.startMsgId!).catch(() => { });
            });
          }
        }

        if (Array.isArray(rawSiteWindows) && rawSiteWindows.length > 0) {
          doc.siteWindows = windowsFuture as any;
          doc.visibleOnSites = windowsFuture.map(w => w.site);
          doc.campaignWindow = resolvedCampaignWindow ?? undefined;
        }

        doc.status = 'scheduled';

        const newRefs: Record<string, ISchedulerRef> = {};
        scheduleListingDraft(id, earliestStart);
        const startMsgId = await qstashScheduleDraft(id, earliestStart);
        for (const w of windowsFuture) {
          newRefs[w.site] = { startMsgId };
        }
        doc.schedulerRefs = newRefs;
        doc.markModified('schedulerRefs');

        pushNote(
          `Scheduled for publish at ${earliestStart.toISOString()}. ${adminNotes || ''}`.trim(),
          'status_change',
        );
        await doc.save();
        await revalidate(doc.slug, doc._id.toString());
        return NextResponse.json({ data: doc, scheduled: true });
      }

      // ── Case C: no windows at all → approve as pending (admin will schedule later) ──
      doc.status = 'approved';
      pushNote(`Approved (no schedule set). ${adminNotes || ''}`.trim(), 'status_change');
      await doc.save();
      await revalidate(doc.slug, doc._id.toString());
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: reject draft
    // ══════════════════════════════════════════════════════
    if (action === 'reject' && table === 'drafts') {
      cancelScheduledDraft(id);

      // Cancel QStash start jobs stored in refs
      const refs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};
      for (const ref of Object.values(refs)) {
        if (ref.startMsgId) {
          const { Client } = await import('@upstash/qstash');
          const c = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;
          await c?.messages.delete(ref.startMsgId).catch(() => { });
        }
      }
      doc.schedulerRefs = {};
      doc.markModified('schedulerRefs');

      doc.status = 'rejected';
      doc.campaignWindow = undefined;
      pushNote(
        `Rejected. ${rejectionNotes || adminNotes || 'No reason provided.'}`,
        'status_change',
      );
      await doc.save();
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: approve-update
    // ══════════════════════════════════════════════════════
    if (action === 'approve-update' && doc.updateRequested && doc.updateRequestData) {
      const updateData = doc.updateRequestData;
      const now = new Date();

      // Normalise any incoming siteWindows in the update payload
      let incomingWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> | null = null;
      if (Array.isArray(updateData.siteWindows) && updateData.siteWindows.length > 0) {
        const parsed = parseSiteWindows(updateData.siteWindows);
        if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
        incomingWindows = parsed.windows;
        updateData.siteWindows = incomingWindows;
        updateData.visibleOnSites = [...new Set(incomingWindows.map(w => w.site))];
      }

      // Apply all non-scheduling fields first
      Object.assign(doc, updateData);
      doc.updateRequested = false;
      doc.updateRequestData = undefined;

      if (incomingWindows) {
        const activeWindows = incomingWindows.filter(w => w.startAt <= now);
        const futureWindows = incomingWindows.filter(w => w.startAt > now);

        if (table === 'live') {
          if (activeWindows.length > 0) {
            // ── Stay live, just reconfigure triggers for active windows ──
            // Apply the active windows to the live doc
            doc.siteWindows = activeWindows as any;
            doc.visibleOnSites = activeWindows.map(w => w.site);

            pushNote(
              `Update approved and applied. ${adminNotes || ''}`.trim(),
              'update_request',
            );
            await doc.save();

            // Reconfigure triggers for the active windows
            await reconfigureTriggers(doc._id.toString(), 'live', activeWindows);

            // If there are also future windows, create/update a parallel draft
            if (futureWindows.length > 0) {
              await _upsertFutureDraft(doc, futureWindows, adminEmail);
            }

            await revalidate(doc.slug, doc._id.toString());
            return NextResponse.json({ data: doc });

          } else {
            // ── All windows are in the future → move listing back to draft ──
            pushNote(
              `Update approved: all new windows are future-dated. Moving to draft and scheduling. ${adminNotes || ''}`.trim(),
              'update_request',
            );

            // Cancel existing expiry timers for this live listing
            cancelExpiryTimersForSlug(doc.slug);
            cancelExpiryTimersBySlug(doc.slug);

            // Cancel QStash expiry jobs
            const oldRefs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};
            for (const ref of Object.values(oldRefs)) {
              if (ref.expiryMsgId) {
                const { Client } = await import('@upstash/qstash');
                const c = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;
                await c?.messages.delete(ref.expiryMsgId).catch(() => { });
              }
            }

            const draftPayload = {
              ...doc.toObject(),
              _id: undefined,
              siteWindows: futureWindows,
              visibleOnSites: futureWindows.map(w => w.site),
              schedulerRefs: {},
              status: 'scheduled' as const,
              isActive: false,
              updatedAt: new Date(),
              campaignWindow: deriveCampaignWindow('Hiring Campaign', futureWindows),
            };

            console.log(id);

            await Listing.deleteOne({ _id: id });
            const newDraft = await ListingDraft.create(draftPayload);

            const earliestFuture = new Date(
              Math.min(...futureWindows.map(w => w.startAt.getTime())),
            );
            scheduleListingDraft(newDraft._id.toString(), earliestFuture);
            const startMsgId = await qstashScheduleDraft(newDraft._id.toString(), earliestFuture);

            const newRefs: Record<string, ISchedulerRef> = {};
            for (const w of futureWindows) {
              newRefs[w.site] = { startMsgId };
            }
            newDraft.schedulerRefs = newRefs;
            newDraft.markModified('schedulerRefs');
            await newDraft.save();

            await revalidate(doc.slug);
            return NextResponse.json({
              movedToDraft: true,
              draftId: newDraft._id,
              slug: doc.slug,
              scheduled: true,
            });
          }
        } else {
          // table === 'drafts' — just reconfigure the draft's triggers
          pushNote(
            `Update approved and applied. ${adminNotes || ''}`.trim(),
            'update_request',
          );
          await doc.save();
          await reconfigureTriggers(doc._id.toString(), 'draft', incomingWindows);
          await revalidate(doc.slug, doc._id.toString());
          return NextResponse.json({ data: doc });
        }
      }

      // No scheduling change in the update — plain field update
      pushNote(
        `Update request approved and applied. ${adminNotes || ''}`.trim(),
        'update_request',
      );
      await doc.save();
      await revalidate(doc.slug, doc._id.toString());
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: reject-update
    // ══════════════════════════════════════════════════════
    if (action === 'reject-update' && doc.updateRequested) {
      doc.updateRequested = false;
      doc.updateRequestData = undefined;
      pushNote(
        `Update request rejected. Reason: ${rejectionNotes || adminNotes || 'No reason provided.'}`,
        'update_rejection',
      );
      await doc.save();
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: toggle isActive on live listing
    // ══════════════════════════════════════════════════════
    if (action === 'toggle-active' && table === 'live') {
      doc.isActive = isActive !== undefined ? isActive : !doc.isActive;
      pushNote(
        `Listing ${doc.isActive ? 'activated' : 'deactivated'}. ${adminNotes || ''}`.trim(),
        'status_change',
      );
      await doc.save();
      await revalidate(doc.slug, doc._id.toString());
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: status change on live listing
    // ══════════════════════════════════════════════════════
    if (action === 'status' && status && table === 'live') {
      const old = doc.status;
      doc.status = status;
      pushNote(
        `Status changed from '${old}' to '${status}'. ${adminNotes || ''}`.trim(),
        'status_change',
      );
      await doc.save();
      await revalidate(doc.slug, doc._id.toString());
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: direct field update (replaces the old inline 'update' block)
    // ══════════════════════════════════════════════════════
    if (action === 'update') {
      const {
        title, companyName, overview, description, applyEmail,
        highlights, benefits, categories, slug, jobBankId,
        jobMode, jobType, slots, visibleOnSites,
        siteWindows: updateSiteWindows,
        campaignWindow: updateCampaignWindow,
        status: updateStatus,
        isActive: updateIsActive,
      } = body;

      if (title !== undefined) doc.title = title;
      if (companyName !== undefined) doc.companyName = companyName;
      if (overview !== undefined) doc.overview = overview;
      if (description !== undefined) doc.description = description;
      if (applyEmail !== undefined) doc.applyEmail = applyEmail;
      if (highlights !== undefined) doc.highlights = highlights;
      if (benefits !== undefined) doc.benefits = benefits;
      if (categories !== undefined) doc.categories = categories;
      if (slug !== undefined) doc.slug = slug;
      if (jobBankId !== undefined) doc.jobBankId = jobBankId;
      if (jobMode !== undefined) doc.jobMode = jobMode;
      if (jobType !== undefined) doc.jobType = jobType;
      if (slots !== undefined) doc.slots = slots;
      if (visibleOnSites !== undefined) doc.visibleOnSites = visibleOnSites;
      if (updateIsActive !== undefined) doc.isActive = updateIsActive;
      if (updateStatus !== undefined) doc.status = updateStatus;

      let siteWindowsChanged = false;

      if (Array.isArray(updateSiteWindows)) {
        if (updateSiteWindows.length > 0) {
          const parsed = parseSiteWindows(updateSiteWindows);
          if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
          doc.siteWindows = parsed.windows as any;
          doc.visibleOnSites = [...new Set(parsed.windows.map(w => w.site))];
        } else {
          // explicitly clearing all windows
          doc.siteWindows = [];
          doc.visibleOnSites = [];
        }
        siteWindowsChanged = true;
      }

      if (updateCampaignWindow?.startAt) {
        const startDate = new Date(updateCampaignWindow.startAt);
        const endDate = new Date(updateCampaignWindow.endAt);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate)
          return NextResponse.json({ error: 'Invalid campaignWindow dates' }, { status: 400 });
        doc.campaignWindow = {
          label: updateCampaignWindow.label ?? doc.campaignWindow?.label ?? 'Hiring Campaign',
          startAt: startDate,
          endAt: endDate,
        };
      } else if (updateCampaignWindow?.label && doc.campaignWindow) {
        doc.campaignWindow.label = updateCampaignWindow.label;
      }

      pushNote(
        `Fields updated directly. ${adminNotes || ''}`.trim(),
        'general',
      );

      console.log(" saving the admin edits  ", doc._id)

      await doc.save();

      // If scheduling changed, reconfigure triggers instead of moving collection
      if (siteWindowsChanged) {
        const newWindows = normalizeSiteWindows(doc.siteWindows ?? []);

        if (table === 'live') {
          await reconfigureTriggers(doc._id.toString(), 'live', newWindows);
        } else {
          // Draft path — check if any windows are already past startAt
          const now = new Date();
          const alreadyActive = newWindows.filter(w => w.startAt <= now);
          const stillFuture = newWindows.filter(w => w.startAt > now);

          if (alreadyActive.length > 0) {
            // Publish immediately — build live payload directly
            const expiryMsgIds = await qstashScheduleExpiry(
              doc.slug,
              alreadyActive.map(w => ({ site: w.site, endAt: w.endAt })),
            );
            scheduleListingExpiry(
              doc.slug,
              alreadyActive.map(w => ({ site: w.site, endAt: w.endAt })),
            );

            const liveRefs: Record<string, ISchedulerRef> = {};
            for (const w of alreadyActive) {
              liveRefs[w.site] = { expiryMsgId: expiryMsgIds[w.site] };
            }

            await Listing.findOneAndUpdate(
              { slug: doc.slug },
              {
                $set: {
                  title: doc.title, companyName: doc.companyName, overview: doc.overview,
                  description: doc.description, applyEmail: doc.applyEmail,
                  highlights: doc.highlights ?? [], benefits: doc.benefits ?? [],
                  categories: doc.categories ?? [], jobBankId: doc.jobBankId ?? '',
                  jobMode: doc.jobMode, jobType: doc.jobType, jobId: doc.jobId,
                  slots: doc.slots ?? [], submittedBy: doc.submittedBy,
                  visibleOnSites: alreadyActive.map(w => w.site),
                  siteWindows: alreadyActive,
                  schedulerRefs: liveRefs,
                  isActive: true,
                  status: 'approved',
                  adminNotes: [
                    ...doc.adminNotes,
                    {
                      message: `Promoted to live immediately (past-due windows) at ${now.toISOString()}.`,
                      type: 'status_change',
                      createdAt: now,
                      createdBy: adminEmail,
                    },
                  ],
                  updateRequested: false,
                },
              },
              { upsert: true, new: true },
            );

            // If future windows remain, keep the draft for them
            if (stillFuture.length > 0) {
              doc.siteWindows = stillFuture as any;
              doc.visibleOnSites = stillFuture.map(w => w.site);
              await reconfigureTriggers(doc._id.toString(), 'draft', stillFuture);
            } else {
              await ListingDraft.findByIdAndDelete(doc._id.toString());
            }
          } else {
            // All windows in future — normal schedule path
            await reconfigureTriggers(doc._id.toString(), 'draft', newWindows);
          }
        }
      }

      await revalidate(doc.slug, doc._id.toString());
      return NextResponse.json({ data: doc });
    }

    // ══════════════════════════════════════════════════════
    // FALLBACK: add an admin note
    // ══════════════════════════════════════════════════════
    if (adminNotes) {
      pushNote(adminNotes, 'general');
      await doc.save();
      await revalidate(doc.slug, doc._id.toString());
      return NextResponse.json({ data: doc });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
  } catch (error) {
    console.error('[PUT /api/admin/listings/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH — whitelist-guarded field edits
// ─────────────────────────────────────────────────────────────

const VALID_STATUSES = ['pending', 'scheduled', 'approved', 'rejected'] as const;

const EDITABLE_FIELDS = new Set([
  'title', 'overview', 'description', 'applyEmail',
  'highlights', 'benefits', 'categories', 'jobBankId',
  'jobMode', 'jobType', 'slots', 'siteWindows', 'status', 'isActive',
]);

function isValidSlot(slot: any): boolean {
  if (!slot || typeof slot !== 'object') return false;
  const { location, province, city, jobPay } = slot;
  if (
    typeof location !== 'string' || !location.trim() ||
    typeof province !== 'string' || !province.trim() ||
    typeof city !== 'string' || !city.trim() ||
    typeof jobPay !== 'number' || isNaN(jobPay)
  ) return false;
  if (slot.shifts) {
    if (!Array.isArray(slot.shifts)) return false;
    for (const shift of slot.shifts) {
      if (!shift || typeof shift.label !== 'string' || !shift.label.trim()) return false;
    }
  }
  return true;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const adminEmail = session?.user?.email || 'admin';

    const { id } = await params;
    const body = await req.json();
    const { table = 'live', fields = {} } = body;

    if (!fields || typeof fields !== 'object' || Array.isArray(fields))
      return NextResponse.json({ error: '`fields` must be an object' }, { status: 400 });

    // Strip non-whitelisted keys
    const safeUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (EDITABLE_FIELDS.has(k)) safeUpdate[k] = v;
    }
    if (Object.keys(safeUpdate).length === 0)
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });

    // Validate slots
    if ('slots' in safeUpdate) {
      const slots = safeUpdate.slots as any[];
      if (!Array.isArray(slots) || slots.length === 0 || !slots.every(isValidSlot))
        return NextResponse.json(
          { error: 'slots must be a non-empty array with valid location, province, city, jobPay' },
          { status: 400 },
        );
      safeUpdate.slots = slots.map((slot: any) => ({
        location: slot.location.trim(),
        province: slot.province.trim(),
        city: slot.city.trim(),
        jobPay: slot.jobPay,
        jobVacancy: slot.jobVacancy || undefined,
        jobStartingTime: slot.jobStartingTime || undefined,
        shifts: slot.shifts || [],
        isActive: slot.isActive !== undefined ? Boolean(slot.isActive) : true,
      }));
    }

    // Validate and normalise siteWindows
    let parsedSiteWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> | null = null;
    if ('siteWindows' in safeUpdate) {
      const parsed = parseSiteWindows(safeUpdate.siteWindows as any[]);
      if (!parsed.ok)
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      parsedSiteWindows = parsed.windows;
      safeUpdate.siteWindows = parsedSiteWindows;
    }

    if ('status' in safeUpdate && !VALID_STATUSES.includes(safeUpdate.status as any))
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );

    const Model = table === 'live' ? Listing : ListingDraft;
    const doc = await (Model as any).findById(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    Object.assign(doc, safeUpdate);

    doc.adminNotes.push({
      message: `Direct edit by admin (${adminEmail}). Fields updated: ${Object.keys(safeUpdate).join(', ')}`,
      type: 'general' as const,
      createdAt: new Date(),
      createdBy: adminEmail,
    });

    await doc.save();

    // If siteWindows changed, reconfigure triggers — no collection move
    if (parsedSiteWindows) {
      await reconfigureTriggers(
        doc.slug,
        table === 'live' ? 'live' : 'draft',
        parsedSiteWindows,
      );
    }

    await revalidate(doc.slug, doc._id.toString());
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('[PATCH /api/admin/listings/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const table = req.nextUrl.searchParams.get('table') === 'live' ? 'live' : 'drafts';
    const Model = table === 'live' ? Listing : ListingDraft;

    const doc = await (Model as any).findById(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Cancel all triggers before deleting
    const refs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};
    if (Object.keys(refs).length > 0) {
      // Cancel QStash jobs
      const { Client } = await import('@upstash/qstash');
      const qstashClient = process.env.QSTASH_TOKEN
        ? new Client({ token: process.env.QSTASH_TOKEN })
        : null;
      if (qstashClient) {
        await Promise.all(
          Object.values(refs).flatMap(ref => [
            ref.startMsgId ? qstashClient.messages.delete(ref.startMsgId).catch(() => { }) : Promise.resolve(),
            ref.expiryMsgId ? qstashClient.messages.delete(ref.expiryMsgId).catch(() => { }) : Promise.resolve(),
          ]),
        );
      }
    }

    // Cancel in-memory timers
    if (table === 'drafts') cancelScheduledDraft(id);
    cancelExpiryTimersForSlug(doc.slug);
    cancelExpiryTimersBySlug(doc.slug);

    await (Model as any).findByIdAndDelete(id);

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${doc.slug}`] }),
    }).catch(() => { });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/listings/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// Internal helper: upsert a parallel draft for future windows
// on an already-live listing.  Called when an update-request or
// direct edit adds future windows to a currently-live listing.
// ─────────────────────────────────────────────────────────────

async function _upsertFutureDraft(
  liveListing: any,
  futureWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }>,
  adminEmail: string,
): Promise<void> {
  const earliestFuture = new Date(
    Math.min(...futureWindows.map(w => w.startAt.getTime())),
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
    siteWindows: futureWindows,
    visibleOnSites: futureWindows.map(w => w.site),
    campaignWindow: deriveCampaignWindow('Hiring Campaign', futureWindows),
    submittedBy: liveListing.submittedBy,
    status: 'scheduled' as const,
    adminNotes: [
      {
        message: `Future windows [${futureWindows.map(w => w.site).join(', ')}] held in draft by admin (${adminEmail}).`,
        type: 'status_change' as const,
        createdAt: new Date(),
        createdBy: adminEmail,
      },
    ],
    updateRequested: false,
  };

  let draftId: string;
  if (existingDraft) {
    // Cancel old start triggers before replacing
    cancelScheduledDraft(existingDraft._id.toString());
    Object.assign(existingDraft, draftFields);
    existingDraft.schedulerRefs = {};
    await existingDraft.save();
    draftId = existingDraft._id.toString();
  } else {
    const created = await ListingDraft.create({ ...draftFields, slug: liveListing.slug });
    draftId = created._id.toString();
  }

  // Register start trigger for the future windows
  scheduleListingDraft(draftId, earliestFuture);
  const startMsgId = await qstashScheduleDraft(draftId, earliestFuture);

  const newRefs: Record<string, ISchedulerRef> = {};
  for (const w of futureWindows) {
    newRefs[w.site] = { startMsgId };
  }

  await ListingDraft.findByIdAndUpdate(draftId, {
    $set: { schedulerRefs: newRefs },
  });
}