// apis/admin/contact-messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ContactMessage from '@/modal/ContactMessage';
import { KNOWN_SITES, SiteId } from '@/lib/sites';
import {
  sendContactUserConfirmationEmail,
  sendContactAdminNotificationEmail,
} from '@/utils/email';

export interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  site: SiteId;          // ← new
  createdAt: string;
}

export interface ApiResponse {
  data: ContactMessageItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ContactApiResponse {
  success: boolean;
  message?: string;
  id?: string;
}

export interface ContactApiError {
  error: string;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const status = sp.get('status') || undefined;
    const site = sp.get('site') || undefined;      // ← new filter
    const dateFrom = sp.get('dateFrom') ? new Date(sp.get('dateFrom')!) : undefined;
    const dateTo = sp.get('dateTo') ? new Date(sp.get('dateTo')!) : undefined;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (site && KNOWN_SITES.includes(site as SiteId)) {
      query.site = site;   // ← apply site filter only if it's a known value
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = dateFrom;
      if (dateTo) query.createdAt.$lte = dateTo;
    }

    const skip = (page - 1) * perPage;

    const [messages, total] = await Promise.all([
      ContactMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
      ContactMessage.countDocuments(query),
    ]);

    const data: ContactMessageItem[] = messages.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      message: doc.message,
      status: doc.status,
      site: doc.site,            // ← new
      createdAt: doc.createdAt.toISOString(),
    }));

    return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) }, { status: 200 });
  } catch (err) {
    console.error('[GET /apis/admin/contact-messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json() as ContactMessageItem;

    // Basic validation
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: 'All fields are required' } satisfies ContactApiError,
        { status: 400 }
      );
    }

    // Site validation                                           ← new
    if (!body.site || !KNOWN_SITES.includes(body.site)) {
      return NextResponse.json(
        { error: `Invalid site. Must be one of: ${KNOWN_SITES.join(', ')}` } satisfies ContactApiError,
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' } satisfies ContactApiError,
        { status: 400 }
      );
    }

    const message = new ContactMessage({
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
      site: body.site,   // ← new
    });

    await message.save();

    const emailResults = await Promise.allSettled([
      sendContactUserConfirmationEmail(body.email, body.name, body.subject || 'General Inquiry'),
      sendContactAdminNotificationEmail(body.name, body.email, '', body.subject || 'General Inquiry', body.message, message._id.toString()),
    ]);

    emailResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[contact/POST] Email ${i === 0 ? 'user' : 'admin'} failed:`, r.reason);
      }
    });

    return NextResponse.json(
      { success: true, message: 'Message sent successfully', id: message._id.toString() } satisfies ContactApiResponse,
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /apis/contact]', err);
    return NextResponse.json(
      { error: 'Internal server error' } satisfies ContactApiError,
      { status: 500 }
    );
  }
}