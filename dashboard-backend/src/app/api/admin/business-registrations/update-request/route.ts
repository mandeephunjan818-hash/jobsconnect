// src/app/api/admin/business-registrations/update-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';
import { sendUpdateRequestEmail } from '@/utils/email';
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

    const {
      businessName,
      businessType,
      location,
      years,
      contactNumber,
      revenue,
      ebitda,
      overview,
      firstName,
      lastName,
      email,
      sellerContactNumber,
      ownerOrBroker,
      confirmed,
      country,
      selfieUrl,
      // ← ADD: structured location fields
      businessLocationAddress,
      businessLocationLat,
      businessLocationLng,
      mapsIframe,
    } = body;

    const registration = await BusinessRegistration.findOne({ userId });
    if (!registration) {
      return NextResponse.json({ error: 'No registration found' }, { status: 404 });
    }

    const updateData = {
      businessName,
      businessType,
      location,
      years,
      contactNumber,
      revenue,
      ebitda,
      overview,
      firstName,
      lastName,
      email,
      sellerContactNumber,
      ownerOrBroker,
      confirmed,
      country,
      selfieUrl: selfieUrl || registration.selfieUrl,
      // ← ADD: store structured location in the update request
      businessLocation: {
        address: businessLocationAddress || '',
        lat:     businessLocationLat     || 0,
        lng:     businessLocationLng     || 0,
      },
      mapsIframe: mapsIframe || registration.mapsIframe || '',
    };

    registration.updateRequested = true;
    registration.updateRequestData = updateData;
    await registration.save();

    revalidatePath(`/admin/business-registrations/${registration._id}/agreements`);

    await sendUpdateRequestEmail(email, businessName, `${firstName} ${lastName}`);

    return NextResponse.json({ message: 'Update request submitted for review' });
  } catch (error) {
    console.error('[PUT /api/business-registration/update-request]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}