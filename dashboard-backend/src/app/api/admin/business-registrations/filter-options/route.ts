// app/api/admin/business-registrations/filter-options/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';

export async function GET() {
  try {
    await connectToDatabase();
    
    const [countries, businessTypes] = await Promise.all([
      BusinessRegistration.distinct('country'),
      BusinessRegistration.distinct('businessType'),
    ]);

    return NextResponse.json({
      countries: countries.filter(Boolean).sort(),
      businessTypes: businessTypes.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error('[GET /api/admin/business-registrations/filter-options]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}