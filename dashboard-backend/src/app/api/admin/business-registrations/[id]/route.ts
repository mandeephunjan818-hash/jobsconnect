//src/app/api/admin/business-registrations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function GET(req: NextRequest,  { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const registration = await BusinessRegistration.findById(id).lean();
    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: registration });
  } catch (error) {
    console.error('[GET /api/admin/business-registrations/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const adminEmail = session?.user?.email || 'admin';

    const { id } = await params;
    const body = await req.json();
    const { status, adminNotes, action, rejectionNotes } = body;

    const registration = await BusinessRegistration.findById(id);
    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Handle update request actions
    if (action === 'approve-update' && registration.updateRequested && registration.updateRequestData) {
      // Apply the requested changes
      Object.assign(registration, registration.updateRequestData);
      registration.updateRequested = false;
      registration.updateRequestData = undefined;
      // Add a note to adminNotes array
      registration.adminNotes.push({
        message: `Update request approved and changes applied. ${adminNotes || ''}`,
        type: 'update_request',
        createdAt: new Date(),
        createdBy: adminEmail,
      });
      await registration.save();
      return NextResponse.json({ data: registration });
    }

    if (action === 'reject-update' && registration.updateRequested) {
      // Clear the update request and store rejection note in adminNotes
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

    // Normal status change (original behaviour)
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
      // Only notes added, no status change
      registration.adminNotes.push({
        message: adminNotes,
        type: 'general',
        createdAt: new Date(),
        createdBy: adminEmail,
      });
    }

    revalidatePath(`/admin/business-registrations/${id}/agreements`); // Revalidate the business registration detail page

    await registration.save();
    return NextResponse.json({ data: registration });
  } catch (error) {
    console.error('[PUT /api/admin/business-registrations/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest,  { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await BusinessRegistration.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    revalidatePath(`/admin/business-registrations/${id}/agreements`); // Revalidate the business registration detail page

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/business-registrations/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}