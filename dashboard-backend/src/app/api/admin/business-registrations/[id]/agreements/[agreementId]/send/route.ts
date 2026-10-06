//src/app/api/admin/business-registrations/[id]/agreements/[agreementId]/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Agreement from '@/modal/Agreement';
import BusinessRegistration from '@/modal/BusinessRegistration';
import { sendAgreementToClient } from '@/utils/email'; // adjust path

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string ; agreementId: string }> }
) {
  try {
    await connectToDatabase();
    const { id: registrationId, agreementId } = await params;

    // Fetch the agreement
    const agreement = await Agreement.findOne({
      _id: agreementId,
      BusinessRegistrationId: registrationId,
    }).lean();
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Fetch the business registration to get client email and name
    const registration = await BusinessRegistration.findById(registrationId).lean();
    if (!registration) {
      return NextResponse.json({ error: 'Business registration not found' }, { status: 404 });
    }

    const clientName = `${registration.firstName} ${registration.lastName}`;
    const businessName = registration.businessName;

    // Send email
    const sent = await sendAgreementToClient(
      registration.email,
      agreement.title,
      agreement.content,
      clientName,
      businessName,
      agreementId 
    );

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Agreement sent successfully' });
  } catch (error) {
    console.error('[POST /api/.../agreements/:agreementId/send]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}