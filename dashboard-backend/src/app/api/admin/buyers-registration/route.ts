import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BuyerRegistration from '@/modal/BuyerRegistration';
import { revalidatePath } from 'next/cache';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const sp = req.nextUrl.searchParams;

    const status = sp.get('status');
    const search = sp.get('search');
    const fromDate = sp.get('fromDate');
    const toDate = sp.get('toDate');
    const country = sp.get('country');

    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const perPage = Math.min(50, parseInt(sp.get('perPage') || '10'));
    const sortBy = sp.get('sortBy') || 'createdAt';
    const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;
    const skip = (page - 1) * perPage;

    const query: any = {};
    if (status) query.status = status;
    if (country) query.country = country;

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [data, total] = await Promise.all([
      BuyerRegistration.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .lean(),
      BuyerRegistration.countDocuments(query),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error('[GET /api/admin/buyer-registration]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { action, ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    let result: any;
    switch (action) {
      case 'delete':
        result = await BuyerRegistration.deleteMany({ _id: { $in: ids } });
        break;
      case 'reviewed':
        result = await BuyerRegistration.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'reviewed' } }
        );
        break;
      case 'rejected':
        result = await BuyerRegistration.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'rejected' } }
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    for (const id of ids) {
      revalidatePath(`/admin/buyers/${id}/agreements`);
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      modifiedCount: result.modifiedCount ?? result.deletedCount,
    });
  } catch (error) {
    console.error('[POST /api/admin/buyer-registration]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}