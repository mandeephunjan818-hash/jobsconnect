import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import { UserProfile } from '@/modal/User';
import { cancelScheduledDraft, cancelExpiryTimersForSlug } from '@/lib/Listingscheduler ';
import type { ISchedulerRef } from '@/modal/sharedListing';

// ─── Cache helpers ────────────────────────────────────────────
// import { cachedQuery, cachedJsonResponse } from '@/lib/cache';

// ─── Serializers (synchronous) ──────────────────────────────

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

/**
 * Synchronous serializer – profileMap is a lookup from userId (string) → name
 */
function serializeDoc(
  doc: any,
  table: 'drafts' | 'live',
  profileMap: Map<string, string>,
) {

  const toISO = (value: any): string | undefined => {
    if (!value) return undefined;
    try {
      return new Date(value).toISOString();
    } catch {
      return undefined;
    }
  };

  const base = {
    id: doc._id.toString(),
    title: doc.title,
    companyName: doc.companyName || "",
    overview: doc.overview || '',
    description: doc.description,
    applyEmail: doc.applyEmail,
    highlights: doc.highlights ?? [],
    benefits: doc.benefits ?? [],
    jobBankId: doc.jobBankId ?? '',
    categories: doc.categories ?? [],
    slug: doc.slug,
    jobMode: doc.jobMode,
    jobType: doc.jobType ?? null,
    jobId: doc.jobId ?? null,
    slots: serializeSlots(doc.slots),
    visibleOnSites: doc.visibleOnSites ?? [],
    siteWindows: serializeSiteWindows(doc.siteWindows),
    submittedBy: profileMap.get(doc.submittedBy?.toString()) ?? 'Unknown', // userId is string
    updateRequested: doc.updateRequested,
    updateRequestData: doc.updateRequested ? doc.updateRequestData : null,
    adminNotes: doc.adminNotes ?? [],
    createdAt: toISO(doc.createdAt),
    updatedAt: toISO(doc.updatedAt),
    status: doc.status,
  };

  if (table === 'live') {
    return { ...base, isActive: doc.isActive };
  }

  return {
    ...base,
    campaignWindow: doc.campaignWindow
      ? {
        label: doc.campaignWindow.label,
        startAt: doc.campaignWindow.startAt instanceof Date
          ? toISO(doc.campaignWindow.startAt)
          : doc.campaignWindow.startAt,
        endAt: doc.campaignWindow.endAt instanceof Date
          ? toISO(doc.campaignWindow.endAt)
          : doc.campaignWindow.endAt,
      }
      : null,
  };
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const table = sp.get('table') === 'live' ? 'live' : 'drafts';
    const Model = table === 'live' ? Listing : ListingDraft;

    // Helper to safely parse date strings
    function parseDateParam(value: string | null): Date | undefined {
      if (!value || value.trim() === '') return undefined;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d;
    }

    const search = sp.get('search') || '';
    const status = sp.get('status') || '';
    const jobMode = sp.get('jobMode') || '';
    const jobType = sp.get('jobType') || '';
    const province = sp.get('province') || '';
    const jobBankId = sp.get('jobBankId') || '';
    const categories: string[] = JSON.parse(sp.get('categories') || '[]');
    const city = sp.get('city') || '';
    const site = sp.get('site') || '';
    const submittedBy = sp.get('submittedBy') || '';
    const jobId = sp.get('jobId') || '';
    const updateRequestedOnly = sp.get('updateRequested') === 'true';

    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

    // ⚠️ 'submittedBy' removed – sorts by userId (not name)
    const allowedSortFields = new Set([
      'createdAt', 'updatedAt', 'title', 'status', 'jobMode', 'jobType',
    ]);
    const rawSort = sp.get('sortBy') || 'createdAt';
    const sortBy = allowedSortFields.has(rawSort) ? rawSort : 'createdAt';
    const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

    // const createdFrom = sp.get('createdFrom');
    // const createdTo = sp.get('createdTo');
    // const updatedFrom = sp.get('updatedFrom');
    // const updatedTo = sp.get('updatedTo');
    const createdFrom = parseDateParam(sp.get('createdFrom'));
    const createdTo = parseDateParam(sp.get('createdTo'));
    const updatedFrom = parseDateParam(sp.get('updatedFrom'));
    const updatedTo = parseDateParam(sp.get('updatedTo'));

    // Detect if this is a plain default view (no filters) → eligible for caching
    // const hasFilters = !!(
    //   search || status || jobMode || jobType || province ||
    //   jobBankId || categories.length || city || site ||
    //   submittedBy || jobId || updateRequestedOnly ||
    //   createdFrom || createdTo || updatedFrom || updatedTo
    // );

    // ── Build query ──────────────────────────────────────────
    const query: any = {};
    const andClauses: any[] = [];

    if (search) {
      andClauses.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { overview: { $regex: search, $options: 'i' } },
          { jobMode: { $regex: search, $options: 'i' } },
          { jobType: { $regex: search, $options: 'i' } },
          { categories: { $regex: search, $options: 'i' } },
          { jobId: { $regex: search, $options: 'i' } },
          { 'slots.location': { $regex: search, $options: 'i' } },
          { 'slots.city': { $regex: search, $options: 'i' } },
          { 'slots.province': { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (status) {
      if (table === 'live') {
        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') query.isActive = false;
        else query.status = status;
      } else {
        query.status = status;
      }
    }

    if (province) query['slots.province'] = { $regex: province, $options: 'i' };
    if (city) query['slots.city'] = { $regex: city, $options: 'i' };
    if (jobMode) query.jobMode = { $regex: jobMode, $options: 'i' };
    if (jobType) query.jobType = { $regex: jobType, $options: 'i' };
    if (jobBankId) query.jobBankId = { $regex: jobBankId, $options: 'i' };
    if (categories.length) query.categories = { $in: categories };
    if (jobId) query.jobId = jobId.toUpperCase();

    if (site) {
      andClauses.push({
        $or: [
          { 'siteWindows.site': site },
          { visibleOnSites: site },
        ],
      });
    }

    if (submittedBy) query.submittedBy = submittedBy;
    if (updateRequestedOnly) query.updateRequested = true;

    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) query.createdAt.$gte = createdFrom;
      if (createdTo) {
        const end = new Date(createdTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }


    if (updatedFrom || updatedTo) {
      query.updatedAt = {};
      if (updatedFrom) query.updatedAt.$gte = new Date(updatedFrom);
      if (updatedTo) {
        const end = new Date(updatedTo);
        end.setHours(23, 59, 59, 999);
        query.updatedAt.$lte = end;
      }
    }

    if (andClauses.length) query.$and = andClauses;

    const skip = (page - 1) * perPage;

    // ── Projection – only fields we need ─────────────────────
    const projection = {
      title: 1, companyName: 1, slug: 1, overview: 1, description: 1, applyEmail: 1,
      highlights: 1, benefits: 1, categories: 1, jobBankId: 1,
      jobMode: 1, jobType: 1, jobId: 1, slots: 1, visibleOnSites: 1,
      siteWindows: 1, submittedBy: 1, updateRequested: 1, updateRequestData: 1,
      adminNotes: 1, createdAt: 1, updatedAt: 1, status: 1,
      ...(table === 'live' ? { isActive: 1 } : { campaignWindow: 1 }),
    };

    // ── Core fetch function (used by both caching and direct) ─
    const fetchPage = async () => {
      const [docs, total] = await Promise.all([
        (Model as any)
          .find(query, projection)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(perPage)
          .lean(),
        (Model as any).countDocuments(query),
      ]);

      // Batch-load submitter names
      const submitterIds: string[] = [
        ...new Set(docs.map((d: any) => d.submittedBy).filter(Boolean) as string[]),
      ];
      let profileMap = new Map<string, string>();
      if (submitterIds.length) {
        // Use (UserProfile as any) to avoid TS strictness with ObjectId casting
        const profiles = await (UserProfile as any)
          .find({ userId: { $in: submitterIds } })
          .select('userId name')
          .lean();
        profileMap = new Map(
          profiles.map((p: any) => [p.userId?.toString() ?? '', p.name]),
        );
      }

      const data = docs.map((doc: any) => serializeDoc(doc, table, profileMap));

      return { data, total, page, perPage, totalPages: Math.ceil(total / perPage), table };
    };

    // ── Caching strategy ─────────────────────────────────────
    // if (!hasFilters) {
    //   // Default (unfiltered) view → cache with tag 'admin-listings'
    //   const getCachedPage = cachedQuery(fetchPage, {
    //     tags: ['admin-listings'],
    //     keyParts: [
    //       'admin-listings',
    //       table,
    //       String(page),
    //       String(perPage),
    //       sortBy,
    //       sortOrder.toString(),
    //     ],
    //   });

    //   const result = await getCachedPage();
    //   return cachedJsonResponse(result, { tags: ['admin-listings'] });
    // }

    // Filtered view → no cache
    const result = await fetchPage();
    return NextResponse.json(result);

  } catch (error) {
    console.error('[GET /api/admin/listings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST (bulk actions) ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { action, ids, table } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

    const Model = table === 'live' ? Listing : ListingDraft;
    let result: any;

    // ── Helper: cancel all QStash jobs for a set of docs ────
    async function cancelTriggersForDocs(docs: any[]) {
      const { Client } = await import('@upstash/qstash');
      const qstashClient = process.env.QSTASH_TOKEN
        ? new Client({ token: process.env.QSTASH_TOKEN })
        : null;

      for (const doc of docs) {
        const refs: Record<string, ISchedulerRef> = doc.schedulerRefs ?? {};

        // Cancel QStash jobs
        if (qstashClient) {
          await Promise.all(
            Object.values(refs).flatMap(ref => [
              ref.startMsgId
                ? qstashClient.messages.delete(ref.startMsgId).catch(() => { })
                : Promise.resolve(),
              ref.expiryMsgId
                ? qstashClient.messages.delete(ref.expiryMsgId).catch(() => { })
                : Promise.resolve(),
            ]),
          );
        }

        // Cancel in-memory timers
        cancelScheduledDraft(doc._id.toString());
        cancelExpiryTimersForSlug(doc.slug);
      }
    }

    switch (action) {

      case 'delete': {
        // Fetch docs first so we can cancel their triggers
        const docsToDelete = await (Model as any)
          .find({ _id: { $in: ids } })
          .select('_id slug schedulerRefs')
          .lean();

        await cancelTriggersForDocs(docsToDelete);
        result = await (Model as any).deleteMany({ _id: { $in: ids } });

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
          },
          body: JSON.stringify({ paths: ['/', '/jobs'] }),
        }).catch(() => { });

        return NextResponse.json({
          message: 'Bulk delete completed',
          deletedCount: result.deletedCount,
        });
      }

      // ── Draft-only status changes ────────────────────────
      // These just set the status field.  Triggers are NOT touched here
      // because scheduling is only configured at the per-listing approve
      // step in [id]/route.ts.  Bulk approve is intentionally "mark as
      // approved so the admin can then schedule each one individually."
      case 'approve':
        result = await ListingDraft.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'approved' } },
        );
        break;

      case 'reject': {
        // Cancel start triggers for all rejected drafts
        const rejectDocs = await ListingDraft
          .find({ _id: { $in: ids } })
          .select('_id slug schedulerRefs campaignWindow')
          .lean();
        await cancelTriggersForDocs(rejectDocs);

        result = await ListingDraft.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'rejected', schedulerRefs: {}, campaignWindow: null } },
        );
        break;
      }

      case 'pending':
        result = await ListingDraft.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'pending' } },
        );
        break;

      // ── Live-only actions ────────────────────────────────
      case 'activate':
        result = await Listing.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: true } },
        );
        break;

      case 'deactivate':
        result = await Listing.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: false } },
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/jobs'] }),
    }).catch(() => { });

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('[POST /api/admin/listings bulk]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}