/**
 * app/api/listings/import/route.ts
 *
 * User bulk import.
 * All rows land in ListingDraft with status='pending'.
 *
 * Scheduler policy (same as user submit):
 *   schedulerRefs is left empty on import.
 *   No QStash triggers are registered here.
 *   Triggers are only set up when an admin approves each draft
 *   via [id]/route.ts → action:'approve'.
 *
 * Rationale: user imports are unreviewed content. Registering
 * triggers before admin review would mean unreviewed listings
 * could auto-publish, which breaks the moderation flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import { KNOWN_SITES, daysBetween } from '@/modal/sharedListing';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id || session.user.email;
    if (!userId)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    await connectToDatabase();

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });

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
        let siteWindows: any[] = [];
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
          visibleOnSites = [...new Set(siteWindows.map((w: any) => w.site))];
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

        const draftData = {
          title: item.title,
          companyName: item.companyName,
          overview: item.overview ?? '',
          description: item.description ?? '',
          applyEmail: item.applyEmail ?? '',
          highlights: item.highlights ?? [],
          benefits: item.benefits ?? [],
          categories: item.categories ?? [],
          jobBankId: item.jobBankId ?? '',
          slug: item.slug,
          visibleOnSites,
          siteWindows,
          // schedulerRefs intentionally omitted — defaults to {}
          // No triggers until admin approves this draft.
          jobMode: item.jobMode,
          jobType: item.jobType || undefined,
          slots,
          submittedBy: userId,
          status: 'pending' as const,
        };

        // ── Upsert scoped to this user ────────────────────
        const existing = await ListingDraft.findOne({
          slug: draftData.slug,
          submittedBy: userId,
        });

        if (existing) {
          // On upsert we do NOT cancel triggers because user imports are
          // always 'pending' — there should be no active triggers to cancel.
          // If somehow there were (edge case), the admin will reconfigure
          // them at approval time anyway.
          Object.assign(existing, draftData);
          await existing.save();
          updated++;
        } else {
          await ListingDraft.create(draftData);
          inserted++;
        }

      } catch (err) {
        console.error('[User Import] Error on item:', item?.title, err);
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
    console.error('[POST /api/listings/import]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}