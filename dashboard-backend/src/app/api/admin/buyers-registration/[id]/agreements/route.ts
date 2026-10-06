//src/app/api/admin/business-registrations/[id]/agreements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Agreement from '@/modal/Agreement';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const agreements = await Agreement.find({ BusinessRegistrationId: id })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(agreements);
  } catch (error) {
    console.error('[GET /api/admin/business-registrations/:id/agreements]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface AgreementRequestBody {
  title: string;
  content: string;
  status?: 'draft' | 'signed' | 'expired';
  version?: string;
  effectiveDate?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { title, content, version, status, effectiveDate } = body as AgreementRequestBody;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const agreement = await Agreement.create({
      BusinessRegistrationId: id,
      title,
      content,
      version: version || '1.0',
      status: status,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      onModel: 'BuyerRegistration',
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/business-registrations/:id/agreements]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}