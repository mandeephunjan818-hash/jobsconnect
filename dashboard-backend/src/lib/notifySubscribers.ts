/**
 * lib/notifySubscribers.ts
 *
 * Sends new-job notification emails to active subscribers of each
 * site that just became active for a listing.
 *
 * Rules:
 *  - Only queries subscribers whose siteId matches one of the promoted sites.
 *  - Only sends to subscribers with status='active' and preferences.jobs=true.
 *  - Sends one email per subscriber per site — if a subscriber is on multiple
 *    promoted sites they receive one email per site (each email is site-branded).
 *  - Failures on individual emails are logged but do not throw.
 *  - The function is fire-and-forget safe (awaited internally, but callers
 *    can await it or not depending on whether they care about completion).
 */

import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';
import { sendNewJobNotificationEmail } from '@/utils/email-job-alert';

// Human-readable labels and root URLs for each site slug.
// Keep in sync with KNOWN_SITES in sharedListing.ts.
const SITE_META: Record<string, { name: string; url: string }> = {
    'jobs-connect.vercel.app': { name: 'Jobs Connect', url: 'https://jobs-connect.vercel.app' },
    'new-jobs-fawn.vercel.app': { name: 'New in Canada Jobs', url: 'https://new-jobs-fawn.vercel.app' },
    'jobsrefugee.ca': { name: 'Jobs for Refugees', url: 'https://jobsrefugee.ca' },
    'vulnerableyouthsjobs.ca': { name: 'Vulnerable Youths Jobs', url: 'https://vulnerableyouthsjobs.ca' },
    'accesscareers.ca': { name: 'Access Careers', url: 'https://accesscareers.ca' },
    'indigenouspeoplesjobs.ca': { name: 'Indigenous Peoples Jobs', url: 'https://indigenouspeoplesjobs.ca' },
};

export interface ListingSnapshot {
    title: string;
    companyName: string;
    overview: string;
    slug: string;
    jobMode: string;
    jobType?: string;
    /** First slot's "City, Province" string — build this before calling */
    location: string;
    jobPay?: number;
}

/**
 * Notify all eligible subscribers for the given sites about a new listing.
 *
 * @param promotedSites  - Array of site slugs that just became active
 * @param listing        - Snapshot of the listing data for the email body
 */
export async function notifySubscribersForSites(
    promotedSites: string[],
    listing: ListingSnapshot,
): Promise<void> {
    if (!promotedSites.length) return;

    try {
        await connectToDatabase();

        for (const site of promotedSites) {
            const meta = SITE_META[site];
            if (!meta) {
                console.warn(`[notify] Unknown site slug "${site}" — skipping subscriber notifications`);
                continue;
            }

            // Fetch all active, jobs-opted-in subscribers for this specific site
            const subscribers = await Subscriber.find({
                siteId: site,
                status: 'active',
                'preferences.jobs': true,
            })
                .select('email name unsubscribeToken')
                .lean();

            if (!subscribers.length) {
                console.log(`[notify] No active subscribers for site="${site}" — skipping`);
                continue;
            }

            console.log(`[notify] Sending job alert to ${subscribers.length} subscriber(s) on site="${site}"`);

            // Send emails concurrently but cap at 10 at a time to avoid SMTP throttling
            const BATCH = 10;
            for (let i = 0; i < subscribers.length; i += BATCH) {
                const batch = subscribers.slice(i, i + BATCH);
                await Promise.all(
                    batch.map(sub =>
                        sendNewJobNotificationEmail(
                            sub.email,
                            sub.name ?? '',
                            meta.name,
                            meta.url,
                            sub.unsubscribeToken,
                            listing,
                        ).catch(err =>
                            console.error(`[notify] Failed for ${sub.email} on site="${site}":`, err),
                        ),
                    ),
                );
            }

            console.log(`[notify] Done — site="${site}", listing="${listing.title}"`);
        }
    } catch (err) {
        console.error('[notify] notifySubscribersForSites failed:', err);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER PATCHES
//
// Copy the two snippets below into Listingscheduler.ts.
//
// 1. Add the import at the top of the file.
// 2. Replace the block after `const promoted = await Listing.findOneAndUpdate(...)`
//    in promoteDraftToListing() with the patched version.
// 3. Replace the equivalent block in the QStash publish handler
//    (app/api/qstash/publish/route.ts) with its patched version.
// ─────────────────────────────────────────────────────────────────────────────

/*
── PATCH 1 ── add to imports at top of Listingscheduler.ts ─────────────────

import { notifySubscribersForSites, type ListingSnapshot } from '@/lib/notifySubscribers';

── PATCH 2 ── replace the section after `const promoted = await Listing.findOneAndUpdate`
              inside promoteDraftToListing() in Listingscheduler.ts ─────────

    const promoted = await Listing.findOneAndUpdate(
      { slug: draft.slug },
      { $set: payload },
      { upsert: true, new: true },
    );

    console.log(
      `[Scheduler] Draft ${draftId} (${draft.jobId}) promoted → live (slug: ${draft.slug}). ` +
      `Sites promoted: ${windowsToPromote.map(w => w.site).join(', ')}`,
    );

    // ── Notify subscribers for each promoted site ──────────
    const firstSlot = draft.slots?.[0] as any;
    const listingSnapshot: ListingSnapshot = {
      title:    draft.title,
      overview: draft.overview,
      slug:     draft.slug,
      jobMode:  draft.jobMode,
      jobType:  draft.jobType,
      location: firstSlot
        ? `${firstSlot.city}, ${firstSlot.province}`
        : 'Location not specified',
      jobPay: firstSlot?.jobPay,
    };
    // Fire-and-forget — do not await so promotion is not delayed by email sending
    notifySubscribersForSites(
      windowsToPromote.map(w => w.site),
      listingSnapshot,
    ).catch(err => console.error('[Scheduler] Subscriber notification failed:', err));

    // ... rest of the function unchanged (windowsStillFuture handling etc.) ...

── PATCH 3 ── same notification block for app/api/qstash/publish/route.ts ──
              add after `const listing = await Listing.findOneAndUpdate(...)` ─

    // ── Notify subscribers for each promoted site ──────────
    const { notifySubscribersForSites } = await import('@/lib/notifySubscribers');
    const firstSlot = draft.slots?.[0] as any;
    notifySubscribersForSites(
      windowsToPromote.map(w => w.site),
      {
        title:    draft.title,
        overview: draft.overview,
        slug:     draft.slug,
        jobMode:  draft.jobMode,
        jobType:  draft.jobType,
        location: firstSlot
          ? `${firstSlot.city}, ${firstSlot.province}`
          : 'Location not specified',
        jobPay: firstSlot?.jobPay,
      },
    ).catch(err => console.error('[QStash/publish] Subscriber notification failed:', err));
*/