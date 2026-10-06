import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Faq from '@/modal/FAQ';
import { KNOWN_SITES } from '@/lib/sites';

export interface FaqAdminItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  sites: string[];                  // ✅ new
}

export interface FaqAdminApiResponse {
  data: FaqAdminItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface FaqAdminApiError {
  error: string;
}

// Helper to parse sites from form data
function parseSites(formData: FormData): string[] {
  const raw = formData.get('sites');
  if (!raw) return ['*'];
  try {
    return JSON.parse(raw as string);
  } catch {
    return (raw as string).split(',').map(s => s.trim()).filter(Boolean);
  }
}

// GET /api/faq (list with pagination, search, and optional site filter)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));
    const siteId = sp.get('siteId') || undefined;   // optional site filter

    const query: any = {};

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
      ];
    }

    // Site filter: FAQs that contain the given site OR are global
    if (siteId) {
      query.sites = { $in: [siteId, '*'] };
    }

    const skip = (page - 1) * perPage;

    const [faqs, total] = await Promise.all([
      Faq.find(query).sort({ order: 1 }).skip(skip).limit(perPage).lean(),
      Faq.countDocuments(query),
    ]);

    const data: FaqAdminItem[] = faqs.map((doc: any) => ({
      id: doc._id.toString(),
      question: doc.question,
      answer: doc.answer,
      order: doc.order,
      sites: doc.sites ?? ['*'],
    }));

    return NextResponse.json({
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    } satisfies FaqAdminApiResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('[GET /api/faq]', err);
    return NextResponse.json({ error: 'Internal server error' } satisfies FaqAdminApiError, { status: 500 });
  }
}

// POST /api/faq (create)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const question = formData.get('question') as string;
    const answer = formData.get('answer') as string;
    const order = parseInt(formData.get('order') as string, 10);
    const sites = parseSites(formData);

    if (!question || !answer || isNaN(order)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate sites
    const validSiteIds = [...KNOWN_SITES, '*'];
    if (!sites.every(s => validSiteIds.includes(s))) {
      return NextResponse.json({ error: 'Invalid siteId in sites' }, { status: 400 });
    }

    const faq = new Faq({ question, answer, order, sites });
    await faq.save();

    const data: FaqAdminItem = {
      id: faq._id.toString(),
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
      sites: faq.sites,
    };

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/', '/faq'] }),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/faq]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}