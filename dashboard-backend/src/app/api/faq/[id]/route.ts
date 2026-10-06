import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Faq from '@/modal/FAQ';
import { FaqAdminItem } from '../route';   // adjust import path as needed
import { KNOWN_SITES } from '@/lib/sites';

interface Params {
    params: Promise<{ id: string }>;
}

// Helper to parse sites from form data (same as above)
function parseSites(formData: FormData): string[] | null {
    const raw = formData.get('sites');
    if (raw === null) return null;            // not provided
    try {
        return JSON.parse(raw as string);
    } catch {
        const parts = (raw as string).split(',').map(s => s.trim()).filter(Boolean);
        return parts.length ? parts : ['*'];
    }
}

export async function GET(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const faq = await Faq.findById(id).lean();
        if (!faq) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        const data: FaqAdminItem = {
            id: faq._id.toString(),
            question: faq.question,
            answer: faq.answer,
            order: faq.order,
            sites: faq.sites ?? ['*'],
        };

        return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
        console.error('[GET /api/faq/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const faq = await Faq.findById(id);
        if (!faq) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        const formData = await req.formData();
        const question = formData.get('question') as string | null;
        const answer = formData.get('answer') as string | null;
        const orderStr = formData.get('order') as string | null;
        const sites = parseSites(formData);   // null if not provided

        if (question) faq.question = question;
        if (answer) faq.answer = answer;
        if (orderStr) {
            const order = parseInt(orderStr, 10);
            if (isNaN(order)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
            faq.order = order;
        }

        if (sites !== null) {
            const validSiteIds = [...KNOWN_SITES, '*'];
            if (!sites.every(s => validSiteIds.includes(s))) {
                return NextResponse.json({ error: 'Invalid siteId in sites' }, { status: 400 });
            }
            faq.sites = sites.length ? sites : ['*'];
        }

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

        return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
        console.error('[PUT /api/faq/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const faq = await Faq.findByIdAndDelete(id);
        if (!faq) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/faq'] }),
        });

        return NextResponse.json({ message: 'FAQ deleted successfully' }, { status: 200 });
    } catch (err) {
        console.error('[DELETE /api/faq/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}