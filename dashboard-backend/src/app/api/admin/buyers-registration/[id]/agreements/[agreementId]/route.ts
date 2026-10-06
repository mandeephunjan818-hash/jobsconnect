//src/app/api/admin/business-registrations/[id]/agreements/[agreementId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Agreement from '@/modal/Agreement';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agreementId: string }> }
) {
  try {
    await connectToDatabase();
    const { id, agreementId } = await params;
    const agreement = await Agreement.findOne({
      _id: agreementId,
      BusinessRegistrationId: id,
    }).lean();
    if (!agreement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(agreement);
  } catch (error) {
    console.error('[GET /api/.../agreements/:agreementId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agreementId: string }> }
) {
  try {
    await connectToDatabase();
    const { id, agreementId } = await params;
    const body = await req.json();
    const { title, content, version, status, effectiveDate } = body;

    const existing = await Agreement.findOne({
      _id: agreementId,
      BusinessRegistrationId: id,
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await Agreement.findByIdAndUpdate(
      agreementId,
      {
        title,
        content,
        version,
        status,
        onModel: 'BuyerRegistration' ,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : existing.effectiveDate,
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT /api/.../agreements/:agreementId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agreementId: string }> }
) {
  try {
    await connectToDatabase();
    const { agreementId } = await params;
    const deleted = await Agreement.findByIdAndDelete(agreementId);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/.../agreements/:agreementId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}