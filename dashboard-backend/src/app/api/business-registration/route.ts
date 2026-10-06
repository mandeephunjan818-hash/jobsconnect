//src/app/api/business-registration/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // adjust path
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';
import { uploadImage } from '@/lib/cloudinary';
import { sendSellerConfirmationEmail } from '@/utils/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from session – use id if available, else email
    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
    }

    await connectToDatabase();

    // Check if this user already has a registration
    const existing = await BusinessRegistration.findOne({ userId });
    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted a registration. Please contact support for changes.' },
        { status: 409 }
      );
    }

    const formData = await req.formData();

    const businessName = formData.get('businessName') as string;
    const businessType = formData.get('businessType') as string;
    const location = formData.get('location') as string;
    const businessLocationAddress = formData.get('businessLocationAddress') as string;
    const businessLocationLat = parseFloat(formData.get('businessLocationLat') as string) || null;
    const businessLocationLng = parseFloat(formData.get('businessLocationLng') as string) || null;
    const mapsIframe = formData.get('mapsIframe') as string;
    const years = parseInt(formData.get('years') as string);
    const contactNumber = formData.get('contactNumber') as string;
    const revenue = formData.get('revenue') as string;
    const ebitda = formData.get('ebitda') as string;
    const overview = formData.get('overview') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const sellerContactNumber = formData.get('sellerContactNumber') as string;
    const ownerOrBroker = formData.get('ownerOrBroker') as string;
    const confirmed = formData.get('confirmed') === 'true';
    const country = formData.get('country') as string;
    const selfieFile = formData.get('selfie') as File | null;

    if (!businessName || !email || !selfieFile || !confirmed) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upload selfie to Cloudinary (or your storage)
    const selfieUrl = await uploadImage(selfieFile, 'business/selfies');

    const registration = await BusinessRegistration.create({
      userId: userId,
      businessName,
      businessType,
      location,
      businessLocation: {
        address: businessLocationAddress,
        lat: businessLocationLat,
        lng: businessLocationLng,
      },
      mapsIframe,
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
      status: 'pending',
    });

    // Send confirmation email (optional, don't block on failure)
    try {
      await sendSellerConfirmationEmail(email, businessName, `${firstName} ${lastName}`);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json({ success: true, id: registration._id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/business-registration]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}