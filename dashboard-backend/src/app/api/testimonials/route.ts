// app/api/testimonials/route.ts  (or /api/testimonials – adjust path)
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Testimonial from '@/modal/Testimonial';
import { uploadImage } from '@/lib/cloudinary';
import { KNOWN_SITES } from '@/lib/sites';

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  imageUrl?: string;
  order: number;
  sites: string[];                // ✅ array
}

// Helper: parse sites from form data (JSON string or individual entries)
function parseSites(formData: FormData): string[] {
  const raw = formData.get('sites');
  if (!raw) return ['*'];
  try {
    return JSON.parse(raw as string);
  } catch {
    // fallback: treat as comma‑separated string
    return (raw as string).split(',').map(s => s.trim()).filter(Boolean);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const rating = sp.get('rating') ? parseInt(sp.get('rating')!) : undefined;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));
    const siteId = sp.get('siteId') || undefined;   // optional site filter

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { text: { $regex: search, $options: 'i' } },
      ];
    }

    if (rating !== undefined && !isNaN(rating)) {
      query.rating = rating;
    }

    // Site filtering: testimonials that contain the given site OR are global
    if (siteId) {
      query.sites = { $in: [siteId, '*'] };
    }

    const skip = (page - 1) * perPage;

    const [testimonials, total] = await Promise.all([
      Testimonial.find(query)
        .sort({ order: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      Testimonial.countDocuments(query),
    ]);

    const data: TestimonialItem[] = testimonials.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      role: doc.role,
      text: doc.text,
      rating: doc.rating,
      imageUrl: doc.imageUrl,
      order: doc.order,
      sites: doc.sites ?? ['*'],   // ✅ array
    }));

    return NextResponse.json({
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/testimonials]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();

    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const text = formData.get('text') as string;
    const rating = parseInt(formData.get('rating') as string, 10);
    const order = parseInt(formData.get('order') as string, 10);
    const sites = parseSites(formData);   // ✅ array

    if (!name || !role || !text || isNaN(rating) || isNaN(order)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Validate sites
    const validSiteIds = [...KNOWN_SITES, '*'];
    if (!sites.every(s => validSiteIds.includes(s))) {
      return NextResponse.json({ error: 'Invalid siteId in sites' }, { status: 400 });
    }

    const imageFile = formData.get('imageFile') as File | null;
    let imageUrl = formData.get('imageUrl') as string;

    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile, 'testimonials');
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
        return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
      }
    }

    const testimonial = new Testimonial({
      name,
      role,
      text,
      rating,
      imageUrl: imageUrl || undefined,
      order,
      sites,   // ✅ array
    });

    await testimonial.save();

    const data: TestimonialItem = {
      id: testimonial._id.toString(),
      name: testimonial.name,
      role: testimonial.role,
      text: testimonial.text,
      rating: testimonial.rating,
      imageUrl: testimonial.imageUrl,
      order: testimonial.order,
      sites: testimonial.sites,
    };

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
      },
      body: JSON.stringify({ paths: ['/'] }),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/testimonials]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
