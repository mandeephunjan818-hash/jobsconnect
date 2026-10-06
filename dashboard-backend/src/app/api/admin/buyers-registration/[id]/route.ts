import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BuyerRegistration from '@/modal/BuyerRegistration';
import { revalidatePath } from 'next/cache';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const registration = await BuyerRegistration.findById(id).lean();
    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: registration });
  } catch (error) {
    console.error('[GET /api/admin/buyers-registration/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const adminEmail = session?.user?.email || 'admin';

    const { id } = await params;
    const body = await req.json();
    const { status, adminNotes, action, rejectionNotes } = body;

    const registration = await BuyerRegistration.findById(id);
    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Handle update request approval
    if (action === 'approve-update' && registration.updateRequested && registration.updateRequestData) {
      registration.updateRequestData.country = registration.updateRequestData.country.label;
      Object.assign(registration, registration.updateRequestData);
      registration.updateRequested = false;
      registration.updateRequestData = undefined;
      registration.adminNotes.push({
        message: `Update request approved and applied. ${adminNotes || ''}`,
        type: 'update_request',
        createdAt: new Date(),
        createdBy: adminEmail,
      });
      await registration.save();
      return NextResponse.json({ data: registration });
    }

    // Handle update request rejection
    if (action === 'reject-update' && registration.updateRequested) {
      registration.updateRequested = false;
      registration.updateRequestData = undefined;
      registration.adminNotes.push({
        message: `Update request rejected. Reason: ${rejectionNotes || adminNotes || 'No reason provided.'}`,
        type: 'update_rejection',
        createdAt: new Date(),
        createdBy: adminEmail,
      });
      await registration.save();
      return NextResponse.json({ data: registration });
    }

    // Normal status change
    const oldStatus = registration.status;
    if (status && status !== oldStatus) {
      registration.status = status;
      registration.adminNotes.push({
        message: `Status changed from ${oldStatus} to ${status}. ${adminNotes || ''}`,
        type: 'status_change',
        createdAt: new Date(),
        createdBy: adminEmail,
      });
    } else if (adminNotes) {
      registration.adminNotes.push({
        message: adminNotes,
        type: 'general',
        createdAt: new Date(),
        createdBy: adminEmail,
      });
    }

    await registration.save();

    revalidatePath(`/admin/buyers/${id}/agreements`); // Revalidate the buyer detail page
    return NextResponse.json({ data: registration });
  } catch (error) {
    console.error('[PUT /api/admin/buyers-registration/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await BuyerRegistration.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    revalidatePath(`/admin/buyers/${id}/agreements`); // Revalidate the buyer detail page
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/buyers-registration/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}