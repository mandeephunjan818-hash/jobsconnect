// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import { sendBuyerConfirmationEmail, sendAdminNotificationEmail } from '@/utils/email';
import BuyerRegistration from '@/modal/BuyerRegistration';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { firstName, lastName, email, phone, country, userId, listingId, location, mapsIframe } = body;

    // Basic validation
    if (!firstName || !lastName || !email || !phone || !country || !userId || !listingId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const inquiry = await BuyerRegistration.create({
      firstName,
      lastName,
      email,
      phone,
      country,
      userId,
      location,
      mapsIframe,
      status: 'new',
    });

    const buyerName = `${firstName} ${lastName}`;
    // listingId is the raw ID; for a better email we ideally fetch the title.
    // We pass listingId as the title fallback – wire in your actual listing title if available.
    const listingTitle = body.listingTitle || listingId;

    // Fire emails non-blocking – a failure never breaks the submission
    Promise.allSettled([
      sendBuyerConfirmationEmail(email, buyerName, listingTitle),
      sendAdminNotificationEmail(buyerName, email, listingId, listingTitle, String(inquiry._id)),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Email ${i} failed:`, r.reason);
        }
      });
    });

    revalidatePath("/admin/buyers");

    return NextResponse.json({ success: true, id: inquiry._id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/contacts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}