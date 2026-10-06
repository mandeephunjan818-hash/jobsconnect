import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Agreement from '@/modal/Agreement';
import BusinessRegistration from '@/modal/BusinessRegistration';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        await connectToDatabase();
        const { token } = await params;

        const agreement = await Agreement.findOne({
            acceptanceToken: token,
            tokenExpiry: { $gt: new Date() }, // not expired
        }).populate('BusinessRegistrationId', 'businessName firstName lastName email');

        if (!agreement) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
        }

        // Do not expose internal fields
        const safeAgreement = {
            _id: agreement._id,
            title: agreement.title,
            content: agreement.content,
            version: agreement.version,
            effectiveDate: agreement.effectiveDate,
            status: agreement.status,
            businessName: (agreement.BusinessRegistrationId as any).businessName,
            clientName: `${(agreement.BusinessRegistrationId as any).firstName} ${(agreement.BusinessRegistrationId as any).lastName}`,
            clientEmail: (agreement.BusinessRegistrationId as any).email,
        };
        return NextResponse.json(safeAgreement);
    } catch (error) {
        console.error('[GET /api/agreement/acceptance/:token]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        await connectToDatabase();
        const { token } = await params;

        const agreement = await Agreement.findOne({
            acceptanceToken: token,
            tokenExpiry: { $gt: new Date() },
            status: { $ne: 'signed' }, // prevent double signing
        });

        if (!agreement) {
            return NextResponse.json({ error: 'Invalid, expired, or already signed link' }, { status: 400 });
        }

        // Update agreement status and acceptance info
        agreement.status = 'signed';
        agreement.acceptedAt = new Date();
        agreement.signatureIp ='unknown';
        // signedByEmail can be fetched from populated businessRegistration
        const registration = await BusinessRegistration.findById(agreement.BusinessRegistrationId);
        agreement.signedByEmail = registration?.email;

        await BusinessRegistration.findByIdAndUpdate(agreement.BusinessRegistrationId, {
            status: 'approved', // or some other state
        });

        await agreement.save();

        return NextResponse.json({ message: 'Agreement signed successfully' });
    } catch (error) {
        console.error('[POST /api/agreement/acceptance/:token]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}