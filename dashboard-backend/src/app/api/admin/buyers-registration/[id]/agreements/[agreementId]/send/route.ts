//src/app/api/admin/business-registrations/[id]/agreements/[agreementId]/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Agreement from '@/modal/Agreement';
import { sendBuyerAgreementToClient } from '@/utils/email'; // adjust path
import BuyerRegistration from '@/modal/BuyerRegistration';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agreementId: string }> }
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
    const registration = await BuyerRegistration.findById(registrationId).lean();
    if (!registration) {
      return NextResponse.json({ error: 'Business registration not found' }, { status: 404 });
    }

    const clientName = `${registration.firstName} ${registration.lastName}`;

    // Send email
    const sent = await sendBuyerAgreementToClient(
      registration.email,
      agreement.title,
      agreement.content,
      clientName,
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