//src/app/api/admin/business-registrations/update-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { sendBuyerUpdateRequestEmail } from '@/utils/email';
import BuyerRegistration from '@/modal/BuyerRegistration';
import { revalidatePath } from 'next/cache';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    // Expected fields: all registration fields (except userId, status, etc.)
    const {
      firstName,
      lastName,
      email,
      phone,
      country,
      location,
      mapsIframe,
    } = body;

    // Find existing registration
    const registration = await BuyerRegistration.findOne({ userId });
    if (!registration) {
      return NextResponse.json({ error: 'No registration found' }, { status: 404 });
    }

    // Store the requested changes (full object) into updateRequestData
    const updateData = {
      firstName,
      lastName,
      email,
      phone,
      country,
      location,
      mapsIframe,
    };

    // Set flags
    registration.updateRequested = true;
    registration.updateRequestData = updateData;
    await registration.save();

    revalidatePath(`/admin/buyers/${registration._id}/agreements`); // Revalidate the buyer detail page

    // Send email to user
    await sendBuyerUpdateRequestEmail(email, `${firstName} ${lastName}`);

    return NextResponse.json({ message: 'Update request submitted for review' });
  } catch (error) {
    console.error('[PUT /api/business-registration/update-request]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}