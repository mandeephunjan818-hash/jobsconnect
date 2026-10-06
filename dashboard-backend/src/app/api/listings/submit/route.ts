import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import { KNOWN_SITES, daysBetween, deriveCampaignWindow } from '@/modal/sharedListing';
import { revalidatePath } from 'next/cache';
import { incrementUsage } from '@/lib/subscription-usage';
import { UserProfile } from '@/modal/User';
import { SubscriptionUsage } from '@/modal/SubscriptionUsage';
import { getAvailableCredits, spendCredits } from '@/lib/credits';
import { getCreditSystemConfig } from '@/modal/CreditSystemConfig';
import mongoose from 'mongoose';
import { reconfigureTriggers } from '@/lib/Listingscheduler ';
import { generateJobId } from '@/modal/sharedListing';

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/**
 * Returns a clean slug, and only appends "-2", "-3", etc. if the base
 * slug is already taken by another draft or live listing. No timestamps,
 * no random suffixes — the slug always matches the title unless there's
 * a real name collision.
 */
async function generateUniqueSlug(title: string): Promise<string> {
    const base = generateSlug(title) || 'listing';
    let candidate = base;
    let attempt = 1;

    while (true) {
        const [draftExists, listingExists] = await Promise.all([
            ListingDraft.exists({ slug: candidate }),
            Listing.exists({ slug: candidate }),
        ]);
        if (!draftExists && !listingExists) return candidate;

        attempt++;
        candidate = `${base}-${attempt}`;
    }
}

function parseSlots(raw: string | null): { ok: true; slots: any[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, slots: [] };
  let parsed: any[];
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'slots must be valid JSON' }; }
  if (!Array.isArray(parsed)) return { ok: false, error: 'slots must be an array' };
  try {
    const slots = parsed.map((s, i) => {
      if (!s.location || !s.province || !s.city)
        throw new Error(`Slot ${i}: location, province, and city are required`);
      if (typeof s.jobPay !== 'number' || isNaN(s.jobPay))
        throw new Error(`Slot ${i}: jobPay must be a number`);
      return {
        location: String(s.location),
        province: String(s.province),
        city: String(s.city),
        jobPay: s.jobPay,
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
      };
    });
    return { ok: true, slots };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function parseSiteWindows(raw: string | null): { ok: true; windows: any[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, windows: [] };
  let parsed: any[];
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'siteWindows must be valid JSON' }; }
  if (!Array.isArray(parsed)) return { ok: false, error: 'siteWindows must be an array' };

  const windows: any[] = [];
  for (const [i, w] of parsed.entries()) {
    if (!KNOWN_SITES.includes(w.site))
      return { ok: false, error: `siteWindows[${i}].site "${w.site}" is not a known site` };
    const startAt = new Date(w.startAt);
    const endAt = new Date(w.endAt);
    if (isNaN(startAt.getTime())) return { ok: false, error: `siteWindows[${i}].startAt is invalid` };
    if (isNaN(endAt.getTime())) return { ok: false, error: `siteWindows[${i}].endAt is invalid` };
    if (endAt <= startAt) return { ok: false, error: `siteWindows[${i}].endAt must be after startAt` };

    const FIVE_MINUTES = 5 * 60 * 1000;
    if (startAt.getTime() < Date.now() - FIVE_MINUTES)
      return { ok: false, error: `siteWindows[${i}].startAt is too far in the past (more than 5 minutes)` };
    windows.push({ site: w.site, startAt, endAt, durationDays: daysBetween(startAt, endAt) });
  }

  const deduped = Object.values(Object.fromEntries(windows.map(w => [w.site, w])));
  return { ok: true, windows: deduped };
}

function parseCampaignWindow(raw: string | null): { ok: true; window: any | undefined } | { ok: false; error: string } {
  if (!raw) return { ok: true, window: undefined };
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'campaignWindow must be valid JSON' }; }
  if (!parsed.label) return { ok: false, error: 'campaignWindow.label is required' };
  const startAt = new Date(parsed.startAt);
  const endAt = new Date(parsed.endAt);
  if (isNaN(startAt.getTime())) return { ok: false, error: 'campaignWindow.startAt is invalid' };
  if (isNaN(endAt.getTime())) return { ok: false, error: 'campaignWindow.endAt is invalid' };
  if (endAt <= startAt) return { ok: false, error: 'campaignWindow.endAt must be after startAt' };

  const FIVE_MINUTES = 5 * 60 * 1000;
  if (startAt.getTime() < Date.now() - FIVE_MINUTES)
    return { ok: false, error: 'campaignWindow.startAt is too far in the past (more than 5 minutes)' };
  return { ok: true, window: { label: parsed.label, startAt, endAt } };
}

/**
 * Builds a default siteWindows array covering EVERY known site for a
 * standard 6-month run, starting now. Used whenever the submitter didn't
 * pick any sites explicitly — we never want a listing to end up with
 * visibleOnSites: [] (invisible everywhere) just because the site picker
 * was left empty.
 */
function buildDefaultAllSitesWindows(): any[] {
  const startAt = new Date();
  const endAt = new Date(startAt);
  endAt.setMonth(endAt.getMonth() + 6);

  return KNOWN_SITES.map(site => ({
    site,
    startAt,
    endAt,
    durationDays: daysBetween(startAt, endAt),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id || session.user.email;
    if (!userId) return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });

    await connectToDatabase();

    // ── Load profile ──────────────────────────────────────────────────────────
    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // ── Check subscription manual-post quota ──────────────────────────────────
    const usage = await SubscriptionUsage.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      periodStart: profile.subscription?.currentPeriodStart ?? new Date(0),
      periodEnd: profile.subscription?.currentPeriodEnd ?? new Date(),
    }).lean();

    const manualPostsUsed = usage?.manualPostsUsed ?? 0;
    const manualPostLimit = profile.subscription?.manualPostLimit ?? 0;

    if (manualPostsUsed >= manualPostLimit && manualPostLimit > 0) {
      return NextResponse.json(
        { error: 'Manual post limit reached. Please upgrade your plan.' },
        { status: 429 }
      );
    }

    // ── Credit balance check ──────────────────────────────────────────────────
    // Resolve stripeCustomerId — required by spendCredits.
    const stripeCustomerId = profile.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error: 'No billing account found. Please complete your account setup before posting a listing.',
          code: 'NO_STRIPE_CUSTOMER',
        },
        { status: 402 }
      );
    }

    // Each listing costs exactly 1 credit regardless of listingsPerCredit.
    // listingsPerCredit controls how many *listings* one credit unlocks on the
    // purchase page (display only) — the actual debit per submission is always 1.
    const CREDITS_PER_LISTING = 1;

    const availableCredits = await getAvailableCredits(userId);
    if (availableCredits < CREDITS_PER_LISTING) {
      // Fetch config so we can tell the user the bundle pricing context
      const config = await getCreditSystemConfig();
      return NextResponse.json(
        {
          error: 'Insufficient credits to post a listing.',
          code: 'INSUFFICIENT_CREDITS',
          availableCredits,
          creditsRequired: CREDITS_PER_LISTING,
          listingsPerCredit: config.listingsPerCredit,
          buyCreditsUrl: '/dashboard/credits',
        },
        { status: 402 }
      );
    }

    // ── Parse & validate form data ────────────────────────────────────────────
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const companyName = formData.get('companyName') as string;
    const overview = formData.get('overview') as string;
    const description = formData.get('description') as string;
    const applyEmail = formData.get('applyEmail') as string;
    const jobMode = formData.get('jobMode') as string;
    const jobBankId = formData.get('jobBankId') as string | null || "";

    if (!title || !overview || !jobMode)
      return NextResponse.json({ error: 'title, overview, and jobMode are required' }, { status: 400 });

    const jobType = formData.get('jobType') as string | null;
    let highlights: string[] = [];
    let benefits: string[] = [];
    let categories: string[] = [];
    try { highlights = JSON.parse(formData.get('highlights') as string ?? '[]'); } catch { /**/ }
    try { benefits = JSON.parse(formData.get('benefits') as string ?? '[]'); } catch { /**/ }
    try {
      const raw = formData.get('categories') as string ?? '[]';
      const parsed = JSON.parse(raw.replace(/'/g, '"'));
      if (Array.isArray(parsed)) categories = parsed.map(item => String(item));
    } catch { categories = []; }

    const slotsResult = parseSlots(formData.get('slots') as string | null);
    if (!slotsResult.ok) return NextResponse.json({ error: slotsResult.error }, { status: 400 });
    if (slotsResult.slots.length === 0)
      return NextResponse.json({ error: 'At least one slot (location) is required' }, { status: 400 });

    const swResult = parseSiteWindows(formData.get('siteWindows') as string | null);
    if (!swResult.ok) return NextResponse.json({ error: swResult.error }, { status: 400 });

    // ── Site windows: default to ALL known sites if none were selected ────────
    // Previously an empty selection went through untouched, producing a
    // listing with visibleOnSites: [] — live in the DB but invisible on
    // every public site. Instead of forcing the user to pick, we now treat
    // "no sites chosen" as "publish everywhere" for the standard 6-month run.
    let siteWindows = swResult.windows;
    let visibleOnSites: string[] = [];
    let campaignWindow: any | undefined;

    if (siteWindows.length > 0) {
      visibleOnSites = [...new Set(siteWindows.map((w: any) => w.site))];
      const cwLabel = (formData.get('campaignLabel') as string | null) ?? 'Hiring Campaign';
      campaignWindow = deriveCampaignWindow(cwLabel, siteWindows);
    } else {
      siteWindows = buildDefaultAllSitesWindows();
      visibleOnSites = [...KNOWN_SITES];
      const cwLabel = (formData.get('campaignLabel') as string | null) ?? 'Hiring Campaign';
      campaignWindow = deriveCampaignWindow(cwLabel, siteWindows);
    }

    // ── Slug uniqueness check ─────────────────────────────────────────────────
    const slug = generateSlug(title);
    const [draftExists, listingExists] = await Promise.all([
      ListingDraft.findOne({ slug }),
      Listing.findOne({ slug }),
    ]);
    if (draftExists || listingExists)
      return NextResponse.json(
        { error: 'A listing with a similar title already exists. Please use a more specific title.' },
        { status: 409 },
      );

    // ── Create draft ──────────────────────────────────────────────────────────
    // We create the draft first so we have a real listingId to attach to the
    // credit transaction. If the draft insert fails we never reach spendCredits,
    // so no credits are lost.
    // const draft = await ListingDraft.create({
    //   title,
    //   companyName,
    //   overview,
    //   description,
    //   applyEmail,
    //   highlights,
    //   benefits,
    //   categories,
    //   jobBankId,
    //   slug,
    //   visibleOnSites,
    //   siteWindows: swResult.windows,
    //   jobMode,
    //   jobType: jobType || undefined,
    //   slots: slotsResult.slots,
    //   submittedBy: userId,
    //   status: 'scheduled',
    //   campaignWindow,
    // });

    const jobId = generateJobId();

    const listing = await Listing.create({
      jobId,
      title,
      companyName,
      overview,
      description,
      applyEmail,
      highlights,
      benefits,
      categories,
      jobBankId,
      slug,
      visibleOnSites,
      siteWindows,
      jobMode,
      jobType: jobType || undefined,
      slots: slotsResult.slots,
      submittedBy: userId,

      // Listing is immediately live
      status: 'approved',
      isActive: true,

      campaignWindow,
    });

    // ── Deduct credit ─────────────────────────────────────────────────────────
    // spendCredits runs sweepExpiredBatches inline before debiting, so the
    // balance it operates on is always current. In the (extremely rare) race
    // where the balance dropped to 0 between our check above and now, it
    // returns success: false and we roll back by deleting the draft.
    const spendResult = await spendCredits({
      userId,
      stripeCustomerId,
      creditsToSpend: CREDITS_PER_LISTING,
      listingId: listing._id.toString(),
      listingTitle: title,
    });

    if (!spendResult.success) {
      // Roll back the listing — user never had enough credits
      await Listing.deleteOne({ _id: listing._id });
      console.warn(
        `[listings/submit] Credit spend failed for userId=${userId}: ${spendResult.message}. ` +
        `Listing ${listing._id} rolled back.`
      );
      return NextResponse.json(
        {
          error: spendResult.message,
          code: 'INSUFFICIENT_CREDITS',
          availableCredits: spendResult.balanceAfter,
          creditsRequired: CREDITS_PER_LISTING,
          buyCreditsUrl: '/dashboard/credits',
        },
        { status: 402 }
      );
    }

    console.log(
      `[listings/submit] userId=${userId} spent ${CREDITS_PER_LISTING} credit(s) for listing ${listing._id}. ` +
      `Balance now: ${spendResult.balanceAfter}`
    );

    // ── Track subscription usage ──────────────────────────────────────────────
    await incrementUsage(userId, 'manual_post', 1, {
      listingId: listing._id.toString(),
      jobId: listing.jobId,
      slug: listing.slug,
    });

    // If siteWindows are present, schedule the triggers
    if (listing.siteWindows?.length > 0) {
      const plainWindows = (listing.siteWindows ?? []).map((w: any) => ({
        site: w.site,
        startAt: w.startAt,
        endAt: w.endAt,
      }));
      await reconfigureTriggers(listing._id.toString(), 'live', plainWindows);
    }

    // ── Revalidate ────────────────────────────────────────────────────────────
    revalidatePath(`/dashboard/listings/${listing._id}`);
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${listing.slug}`] }),
    }).catch(() => { });

    return NextResponse.json(
      {
        success: true,
        id: listing._id,
        jobId: listing.jobId,
        slug: listing.slug,
        message: 'Listing submitted for admin review.',
        creditsRemaining: spendResult.balanceAfter,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/listings/submit]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}