/**
 * app/api/admin/listings/import/route.ts
 *
 * Admin bulk import.
 * Accepts new (slots[]) and legacy (flat location/jobPay) row formats.
 *
 * Scheduler wiring:
 *   - Rows imported to 'drafts' with future siteWindows get start + expiry
 *     QStash jobs registered, same as the admin create flow.
 *   - Rows imported to 'live' get expiry jobs registered immediately.
 *   - On upsert the old schedulerRefs are cancelled first, then replaced.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import { KNOWN_SITES, daysBetween, deriveCampaignWindow } from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';
import {
  scheduleListingDraft,
  qstashScheduleDraft,
  qstashScheduleExpiry,
  scheduleListingExpiry,
  cancelScheduledDraft,
  cancelExpiryTimersForSlug,
} from '@/lib/Listingscheduler ';

async function cancelExistingTriggers(doc: any) {
  const refs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};
  if (!Object.keys(refs).length) return;

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
  cancelScheduledDraft(doc._id.toString());
  cancelExpiryTimersForSlug(doc.slug);
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { items, table = 'drafts' } = await req.json();

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });

    const isLive = table === 'live';
    const Model = isLive ? Listing : ListingDraft;

    let inserted = 0, updated = 0, errors = 0;

    for (const item of items) {
      try {
        if (!item.title || !item.jobMode) { errors++; continue; }

        // ── Slug ──────────────────────────────────────────
        if (!item.slug) {
          item.slug =
            item.title.toLowerCase().trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .slice(0, 80) +
            '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        }

        // ── String array fields ───────────────────────────
        if (typeof item.highlights === 'string')
          item.highlights = item.highlights.split('|').map((s: string) => s.trim()).filter(Boolean);
        if (typeof item.benefits === 'string')
          item.benefits = item.benefits.split('|').map((s: string) => s.trim()).filter(Boolean);
        if (typeof item.categories === 'string')
          item.categories = item.categories.split('|').map((s: string) => s.trim()).filter(Boolean);

        // ── siteWindows ───────────────────────────────────
        let siteWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];
        let visibleOnSites: string[] = [];

        if (Array.isArray(item.siteWindows) && item.siteWindows.length > 0) {
          siteWindows = item.siteWindows
            .filter((w: any) => KNOWN_SITES.includes(w.site))
            .map((w: any) => {
              const startAt = new Date(w.startAt);
              const endAt = new Date(w.endAt);
              return {
                site: w.site,
                startAt,
                endAt,
                durationDays: isNaN(startAt.getTime()) || isNaN(endAt.getTime())
                  ? 1
                  : daysBetween(startAt, endAt),
              };
            });
          visibleOnSites = [...new Set(siteWindows.map(w => w.site))];
        } else if (Array.isArray(item.visibleOnSites)) {
          visibleOnSites = item.visibleOnSites.map(String);
        } else if (typeof item.visibleOnSites === 'string') {
          visibleOnSites = item.visibleOnSites.split('|').map((s: string) => s.trim()).filter(Boolean);
        } else if (item.showToSite != null) {
          visibleOnSites = [String(item.showToSite)];
        }

        // ── Slots ─────────────────────────────────────────
        let slots: any[];
        if (Array.isArray(item.slots) && item.slots.length > 0) {
          slots = item.slots.map((s: any) => ({
            location: String(s.location ?? ''),
            province: String(s.province ?? ''),
            city: String(s.city ?? ''),
            jobPay: parseFloat(s.jobPay) || 0,
            jobVacancy: s.jobVacancy ? String(s.jobVacancy) : undefined,
            jobStartingTime: s.jobStartingTime ? String(s.jobStartingTime) : undefined,
            isActive: s.isActive !== false,
            shifts: Array.isArray(s.shifts)
              ? s.shifts.map((sh: any) => ({
                label: String(sh.label ?? 'Shift'),
                startTime: sh.startTime ? String(sh.startTime) : undefined,
                endTime: sh.endTime ? String(sh.endTime) : undefined,
                days: Array.isArray(sh.days) ? sh.days.map(String) : [],
              }))
              : [],
          }));
        } else {
          if (!item.location || !item.jobPay) { errors++; continue; }
          slots = [{
            location: String(item.location),
            province: String(item.province ?? ''),
            city: String(item.city ?? ''),
            jobPay: parseFloat(item.jobPay) || 0,
            jobVacancy: item.jobVacancy ? String(item.jobVacancy) : undefined,
            jobStartingTime: item.jobStartingTime ? String(item.jobStartingTime) : undefined,
            isActive: true,
            shifts: [],
          }];
        }

        const itemStatus = isLive
          ? (item.status ?? 'approved')
          : (item.status ?? 'pending');

        const payload: any = {
          title: item.title,
          companyName: item.companyName ?? "",
          overview: item.overview ?? '',
          description: item.description ?? '',
          applyEmail: item.applyEmail ?? '',
          highlights: item.highlights ?? [],
          benefits: item.benefits ?? [],
          jobBankId: item.jobBankId ?? '',
          categories: item.categories ?? [],
          slug: item.slug,
          visibleOnSites,
          siteWindows,
          jobMode: item.jobMode,
          jobType: item.jobType || undefined,
          slots,
          submittedBy: item.submittedBy ?? 'admin',
          status: itemStatus,
          schedulerRefs: {},           // will be filled in below
        };

        if (isLive) payload.isActive = item.isActive !== false;
        if (!isLive && siteWindows.length > 0) {
          payload.campaignWindow = deriveCampaignWindow('Hiring Campaign', siteWindows);
        }

        // ── Upsert ────────────────────────────────────────
        const existing = await (Model as any).findOne({ slug: payload.slug });

        let doc: any;
        if (existing) {
          // Cancel existing triggers before replacing
          await cancelExistingTriggers(existing);
          Object.assign(existing, payload);
          await existing.save();
          doc = existing;
          updated++;
        } else {
          doc = await (Model as any).create(payload);
          inserted++;
        }

        // ── Register triggers ─────────────────────────────
        const now = new Date();
        const newRefs: Record<string, ISchedulerRef> = {};

        if (siteWindows.length > 0) {
          if (isLive) {
            // Live import — register expiry triggers only
            const windowsStillActive = siteWindows.filter(w => w.endAt > now);
            const windowsAlreadyExpired = siteWindows.filter(w => w.endAt <= now);

            // Immediately expire already-past windows
            // (they'll be cleaned up on next expiry check; log for now)
            if (windowsAlreadyExpired.length > 0) {
              console.warn(
                `[Admin Import] slug="${doc.slug}" has ${windowsAlreadyExpired.length} ` +
                'already-expired windows — they will be cleaned on next scheduler run.',
              );
            }

            if (windowsStillActive.length > 0) {
              scheduleListingExpiry(doc.slug, windowsStillActive.map(w => ({ site: w.site, endAt: w.endAt })));
              const expiryMsgIds = await qstashScheduleExpiry(
                doc.slug,
                windowsStillActive.map(w => ({ site: w.site, endAt: w.endAt })),
              );
              for (const w of windowsStillActive) {
                newRefs[w.site] = { expiryMsgId: expiryMsgIds[w.site] };
              }
            }

          } else {
            // Draft import — register start triggers for future windows
            const windowsFuture = siteWindows.filter(w => w.startAt > now);
            const windowsPastDue = siteWindows.filter(w => w.startAt <= now);

            if (windowsFuture.length > 0) {
              const earliest = new Date(Math.min(...windowsFuture.map(w => w.startAt.getTime())));
              scheduleListingDraft(doc._id.toString(), earliest);
              const startMsgId = await qstashScheduleDraft(doc._id.toString(), earliest);
              for (const w of windowsFuture) {
                newRefs[w.site] = { startMsgId };
              }
            }

            if (windowsPastDue.length > 0) {
              // Past-due — promote immediately
              console.log(
                `[Admin Import] slug="${doc.slug}" has ${windowsPastDue.length} past-due windows — promoting`,
              );
              scheduleListingDraft(doc._id.toString(), new Date(0)); // fires immediately
            }

            // Pre-register expiry for all windows
            const expiryMsgIds = await qstashScheduleExpiry(
              doc.slug,
              siteWindows.map(w => ({ site: w.site, endAt: w.endAt })),
            );
            scheduleListingExpiry(doc.slug, siteWindows.map(w => ({ site: w.site, endAt: w.endAt })));
            for (const w of siteWindows) {
              newRefs[w.site] = { ...newRefs[w.site], expiryMsgId: expiryMsgIds[w.site] };
            }
          }
        }

        // Persist refs
        doc.schedulerRefs = newRefs;
        doc.markModified('schedulerRefs');
        await doc.save();

      } catch (err) {
        console.error('[Admin Import] Error on item:', item?.title, err);
        errors++;
      }
    }

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/jobs'] }),
    }).catch(() => { });

    return NextResponse.json({ message: 'Import completed', inserted, updated, errors });
  } catch (error) {
    console.error('[POST /api/admin/listings/import]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}