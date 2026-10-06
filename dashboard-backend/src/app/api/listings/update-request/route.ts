// app/api/listings/update-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import { KNOWN_SITES, daysBetween } from '@/modal/sharedListing';
import mongoose from 'mongoose';
import {
  reconfigureTriggers,
  upsertFutureDraftForLiveListing,
  moveLiveListingToDraft,
} from '@/lib/Listingscheduler ';

/**
 * No admin gate — every update goes live (or is scheduled) immediately.
 *
 * Rules for siteWindows changes:
 *   - listingType === 'live':
 *       - no windows at all           → move the whole listing to draft (pending)
 *       - some windows already active → stay live for those, reconfigure their
 *                                        triggers, and if there are ALSO future
 *                                        windows, spin off a parallel draft for them
 *       - all windows are future-dated → not visible anywhere right now, so move
 *                                        the whole listing to draft (scheduled)
 *   - listingType === 'draft':
 *       - reconfigureTriggers handles active-vs-future internally, including
 *         immediate self-promotion of past-due windows
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id || session.user.email;
    if (!userId)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    await connectToDatabase();

    const formData = await req.formData();
    const listingId = formData.get('listingId') as string;
    const listingType = formData.get('listingType') as 'draft' | 'live';

    if (!listingId || !listingType)
      return NextResponse.json(
        { error: 'listingId and listingType are required' },
        { status: 400 },
      );

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: 'Invalid listingId' }, { status: 400 });
    }

    const Model = listingType === 'draft' ? ListingDraft : Listing;

    console.log('the listing type is = ', listingType);

    const listing = await (Model as any).findOne({
      _id: new mongoose.Types.ObjectId(listingId),
      submittedBy: userId,
    });

    if (!listing)
      return NextResponse.json(
        { error: 'Listing not found or you do not have permission to update it.' },
        { status: 404 },
      );

    // ── Build update payload (non-scheduling fields) ─────────
    const updateData: any = {};

    // Scalar fields
    for (const field of ['title', 'companyName', 'overview', 'description', 'applyEmail', 'jobMode', 'jobType', 'jobBankId']) {
      const val = formData.get(field);
      if (val !== null) updateData[field] = val as string;
    }

    // JSON array fields
    for (const field of ['highlights', 'benefits', 'categories']) {
      const raw = formData.get(field) as string | null;
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          updateData[field] = Array.isArray(parsed) ? parsed.map(item => String(item)) : [];
        } catch {
          updateData[field] = [];
        }
      }
    }

    // Slots
    const slotsRaw = formData.get('slots') as string | null;
    if (slotsRaw !== null) {
      try {
        const parsed = JSON.parse(slotsRaw);
        if (Array.isArray(parsed)) updateData.slots = parsed;
      } catch { /**/ }
    }

    // ── Parse siteWindows separately — these drive scheduling ─
    const swRaw = formData.get('siteWindows') as string | null;
    let siteWindowsChanged = false;
    let parsedWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];

    if (swRaw !== null) {
      try {
        const raw: any[] = JSON.parse(swRaw);
        if (Array.isArray(raw)) {
          parsedWindows = raw
            .filter(w => KNOWN_SITES.includes(w.site))
            .map(w => {
              const startAt = new Date(w.startAt);
              const endAt = new Date(w.endAt);
              return { site: w.site, startAt, endAt, durationDays: daysBetween(startAt, endAt) };
            });
          siteWindowsChanged = true;
        }
      } catch { /* leave siteWindowsChanged = false */ }
    }

    // Legacy visibleOnSites (only used if siteWindows weren't provided at all)
    if (!siteWindowsChanged) {
      const vsRaw = formData.get('visibleOnSites') as string | null;
      if (vsRaw !== null) {
        try {
          const parsed = JSON.parse(vsRaw);
          if (Array.isArray(parsed)) updateData.visibleOnSites = parsed;
        } catch { /**/ }
      }
    }

    // Campaign window (only relevant while scheduling logic below doesn't override it)
    const cwRaw = formData.get('campaignWindow') as string | null;
    if (cwRaw !== null) {
      try {
        const parsed = JSON.parse(cwRaw);
        if (parsed?.label && parsed?.startAt && parsed?.endAt) {
          updateData.campaignWindow = {
            label: parsed.label,
            startAt: new Date(parsed.startAt),
            endAt: new Date(parsed.endAt),
          };
        }
      } catch { /**/ }
    }

    // ── Apply non-scheduling fields directly — no admin review ──
    Object.assign(listing, updateData);
    listing.updateRequested = false;
    listing.updateRequestData = null;
    await listing.save();

    // Revalidate frontend pages
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${listing.slug}`] }),
    }).catch(() => { });

    // ── Handle scheduling changes ─────────────────────────────
    let responsePayload: Record<string, any> = { message: 'Listing updated successfully.' };

    if (siteWindowsChanged) {
      const now = new Date();
      const activeWindows = parsedWindows.filter(w => w.startAt <= now);
      const futureWindows = parsedWindows.filter(w => w.startAt > now);

      if (listingType === 'live') {
        if (parsedWindows.length === 0) {
          // Cleared all windows — nothing visible anywhere; move to draft (pending)
          const newDraft = await moveLiveListingToDraft(listing, [], String(userId));
          responsePayload = {
            message: 'All site windows removed. Listing moved to draft (pending).',
            movedToDraft: true,
            draftId: newDraft._id,
          };
        } else if (activeWindows.length > 0) {
          // Stay live for active windows; reconfigure their triggers immediately.
          listing.siteWindows = activeWindows as any;
          listing.visibleOnSites = activeWindows.map(w => w.site);
          await listing.save();
          await reconfigureTriggers(listing._id.toString(), 'live', activeWindows);

          if (futureWindows.length > 0) {
            await upsertFutureDraftForLiveListing(listing, futureWindows, String(userId));
            responsePayload.note =
              `Active on [${activeWindows.map(w => w.site).join(', ')}] now. ` +
              `Future windows [${futureWindows.map(w => w.site).join(', ')}] scheduled separately.`;
          }
        } else {
          // All new windows are future-dated — not visible right now, move to draft.
          const newDraft = await moveLiveListingToDraft(listing, futureWindows, String(userId));
          responsePayload = {
            message: 'New schedule is entirely in the future. Listing moved to draft and scheduled.',
            movedToDraft: true,
            draftId: newDraft._id,
            scheduled: true,
          };
        }
      } else {
        // listingType === 'draft' — reconfigureTriggers handles active-vs-future
        // (including immediate self-promotion of past-due windows) and
        // pre-registers expiry for every window up front.
        listing.siteWindows = parsedWindows as any;
        listing.visibleOnSites = parsedWindows.map(w => w.site);
        await listing.save();
        await reconfigureTriggers(listing._id.toString(), 'draft', parsedWindows);
      }
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[PUT /api/listings/update-request]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}