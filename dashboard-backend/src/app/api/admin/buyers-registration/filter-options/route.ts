import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BuyerRegistration from '@/modal/BuyerRegistration';

export async function GET() {
  try {
    await connectToDatabase();
    const countries = await BuyerRegistration.distinct('country');
    return NextResponse.json({
      countries: countries.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error('[GET /api/admin/buyer-registration/filter-options]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}