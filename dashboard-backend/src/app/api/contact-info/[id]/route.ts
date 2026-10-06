// app/apis/contact-info/[id]/route.ts (or wherever your route is defined)

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ContactInfo from '@/modal/ContactInfo';
import { ContactInfoItem } from '../route'; // or define the type locally

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const existing = await ContactInfo.findById(id);
        if (!existing) {
            return NextResponse.json({ error: 'Contact info not found' }, { status: 404 });
        }

        const body = await req.json();

        // Update fields (only those that are provided)
        if (body.phone !== undefined) existing.phone = body.phone;
        if (body.addressLine1 !== undefined) existing.addressLine1 = body.addressLine1;
        if (body.addressLine2 !== undefined) existing.addressLine2 = body.addressLine2;
        if (body.emails !== undefined) existing.emails = body.emails;
        if (body.socialLinks !== undefined) existing.socialLinks = body.socialLinks;

        await existing.save();

        const responseData: ContactInfoItem = {
            id: existing._id.toString(),
            phone: existing.phone,
            addressLine1: existing.addressLine1,
            addressLine2: existing.addressLine2,
            emails: existing.emails,
            socialLinks: existing.socialLinks,
        };

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us'] }),
        });

        return NextResponse.json({ data: responseData }, { status: 200 });
    } catch (error) {
        console.error('[PUT /apis/contact-info/:id]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}