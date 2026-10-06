import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';

/** Shared slot serializer */
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

/** Shared siteWindows serializer */
function serializeSiteWindows(windows: any[] = []) {
  return windows.map(w => ({
    site: w.site,
    startAt: w.startAt instanceof Date ? w.startAt.toISOString() : w.startAt,
    endAt: w.endAt instanceof Date ? w.endAt.toISOString() : w.endAt,
    durationDays: w.durationDays,
  }));
}

function mapDoc(d: any, isLive: boolean) {
  const base = {
    id: d._id.toString(),
    _source: isLive ? 'live' : 'draft',
    title: d.title,
    companyName: d.companyName ?? "",
    overview: d.overview ?? '',
    description: d.description ?? '',
    applyEmail: d.applyEmail ?? '',
    highlights: d.highlights ?? [],
    benefits: d.benefits ?? [],
    categories: d.categories ?? [],
    jobBankId: d.jobBankId ?? "",
    slug: d.slug,
    visibleOnSites: d.visibleOnSites ?? [],
    siteWindows: serializeSiteWindows(d.siteWindows),
    status: d.status,

    jobMode: d.jobMode,
    jobType: d.jobType ?? null,
    jobId: d.jobId ?? null,

    slots: serializeSlots(d.slots),

    submittedBy: d.submittedBy,
    updateRequested: d.updateRequested,
    updateRequestData: d.updateRequestData ?? null,
    createdAt: d.createdAt?.toISOString(),
    updatedAt: d.updatedAt?.toISOString(),
  };

  if (isLive) {
    return { ...base, isActive: d.isActive };
  }

  return {
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
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id || session.user.email;
    if (!userId)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const status = sp.get('status') || '';
    const categories: string[] = JSON.parse(sp.get('categories') || '[]');
    const tableParam = sp.get('table') || 'all';               // ⬅ default to 'all' now
    const createdFrom = sp.get('createdFrom');
    const createdTo = sp.get('createdTo');
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

    const query: any = { submittedBy: userId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { overview: { $regex: search, $options: 'i' } },
        { jobMode: { $regex: search, $options: 'i' } },
        { jobType: { $regex: search, $options: 'i' } },
        { jobId: { $regex: search, $options: 'i' } },
        { 'slots.location': { $regex: search, $options: 'i' } },
        { 'slots.city': { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;

    if (categories.length) {
      query.categories = { $in: categories };
    }

    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
      if (createdTo) {
        const end = new Date(createdTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const isAll = tableParam === 'all';
    const isLive = tableParam === 'live';
    const isDrafts = tableParam === 'drafts';

    let docs: any[] = [];
    let total = 0;

    if (isAll) {
      // ── Fetch both drafts and live ─────────────────────────
      const [draftDocs, liveDocs, draftTotal, liveTotal] = await Promise.all([
        (ListingDraft as any).find(query).sort({ createdAt: -1 }).lean(),
        (Listing as any).find(query).sort({ createdAt: -1 }).lean(),
        (ListingDraft as any).countDocuments(query),
        (Listing as any).countDocuments(query),
      ]);

      // Map and merge
      const merged = [
        ...draftDocs.map((d: any) => mapDoc(d, false)),
        ...liveDocs.map((d: any) => mapDoc(d, true)),
      ];

      // Sort merged by createdAt descending
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      total = draftTotal + liveTotal;
      const skip = (page - 1) * perPage;
      docs = merged.slice(skip, skip + perPage);
    } else {
      // ── Single collection ──────────────────────────────────
      const Model = isLive ? Listing : ListingDraft;
      const skip = (page - 1) * perPage;
      const [docsResult, totalResult] = await Promise.all([
        (Model as any).find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
        (Model as any).countDocuments(query),
      ]);
      docs = docsResult.map((d: any) => mapDoc(d, isLive));
      total = totalResult;
    }

    return NextResponse.json({
      data: docs,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      table: tableParam,
    });
  } catch (error) {
    console.error('[GET /api/listings/my]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}