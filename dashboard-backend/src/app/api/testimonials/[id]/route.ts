// app/api/testimonials/[id]/route.ts  (adjust the actual path to match your project)
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';               // typo fixed
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
    sites: string[];                   // ✅ now an array
}

// Helper: parse sites from form data (JSON string or comma‑separated)
function parseSites(formData: FormData): string[] | null {
    const raw = formData.get('sites');
    if (raw === null) return null;          // not provided → keep current
    try {
        const parsed = JSON.parse(raw as string);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // fallback: treat as comma‑separated string
        const parts = (raw as string).split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) return parts;
    }
    return null;
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const testimonial = await Testimonial.findById(id);
        if (!testimonial) {
            return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
        }

        const formData = await req.formData();

        const name = formData.get('name') as string | null;
        const role = formData.get('role') as string | null;
        const text = formData.get('text') as string | null;
        const ratingStr = formData.get('rating') as string | null;
        const orderStr = formData.get('order') as string | null;
        const sites = parseSites(formData);                // ✅ array or null

        if (name) testimonial.name = name;
        if (role) testimonial.role = role;
        if (text) testimonial.text = text;

        if (ratingStr) {
            const rating = parseInt(ratingStr, 10);
            if (isNaN(rating) || rating < 1 || rating > 5) {
                return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 });
            }
            testimonial.rating = rating;
        }

        if (orderStr) {
            const order = parseInt(orderStr, 10);
            if (isNaN(order) || order < 1) {
                return NextResponse.json({ error: 'Invalid order value' }, { status: 400 });
            }
            testimonial.order = order;
        }

        // ✅ validate and update sites if provided
        if (sites !== null) {
            const validSiteIds = [...KNOWN_SITES, '*'];
            if (!sites.every(s => validSiteIds.includes(s))) {
                return NextResponse.json({ error: 'Invalid siteId in sites' }, { status: 400 });
            }
            testimonial.sites = sites.length ? sites : ['*'];   // fallback to global
        }

        const imageFile = formData.get('imageFile') as File | null;
        if (imageFile) {
            try {
                testimonial.imageUrl = await uploadImage(imageFile, 'testimonials');
            } catch (uploadErr) {
                console.error('Image upload failed:', uploadErr);
                return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
            }
        } else {
            const imageUrl = formData.get('imageUrl') as string | null;
            if (imageUrl !== null) {
                testimonial.imageUrl = imageUrl || undefined;
            }
        }

        await testimonial.save();

        const data: TestimonialItem = {
            id: testimonial._id.toString(),
            name: testimonial.name,
            role: testimonial.role,
            text: testimonial.text,
            rating: testimonial.rating,
            imageUrl: testimonial.imageUrl,
            order: testimonial.order,
            sites: testimonial.sites,           // ✅ array
        };

        // Revalidation
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
        console.error('[PUT /api/testimonials/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const testimonial = await Testimonial.findByIdAndDelete(id);
        if (!testimonial) {
            return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
        }

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return NextResponse.json({ message: 'Testimonial deleted successfully' }, { status: 200 });
    } catch (err) {
        console.error('[DELETE /apis/admin/testimonials/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}