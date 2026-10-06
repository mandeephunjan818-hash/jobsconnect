//src/app/api/admin/business-registrations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const sp = req.nextUrl.searchParams;

    const status = sp.get('status');
    const search = sp.get('search');
    const fromDate = sp.get('fromDate');
    const toDate = sp.get('toDate');
    // New filters
    const country = sp.get('country');
    const businessType = sp.get('businessType');

    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const perPage = Math.min(50, parseInt(sp.get('perPage') || '10'));
    const sortBy = sp.get('sortBy') || 'createdAt';
    const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;
    const skip = (page - 1) * perPage;

    const query: any = {};
    if (status) query.status = status;
    if (country) query.country = country;
    if (businessType) query.businessType = businessType;

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
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
      BusinessRegistration.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .lean(),
      BusinessRegistration.countDocuments(query),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error('[GET /api/admin/business-registrations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}