//src/app/api/admin/business-registrations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { action, ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'delete':
        result = await BusinessRegistration.deleteMany({ _id: { $in: ids } });
        break;
      case 'approve':
        result = await BusinessRegistration.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'approved' } }
        );
        break;
      case 'reject':
        result = await BusinessRegistration.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'rejected' } }
        );
        break;
      case 'pending':
        result = await BusinessRegistration.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'pending' } }
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    for (const id of ids) {

      revalidatePath(`/admin/business-registrations/${id}/agreements`); // Revalidate the business registrations list page

    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      modifiedCount: 'modifiedCount' in result ? result.modifiedCount : result.deletedCount,
    });
  } catch (error) {
    console.error('[BULK /api/admin/business-registrations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}