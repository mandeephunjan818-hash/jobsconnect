//src/app/api/admin/business-registrations/user/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id || session.user.email;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    console.log('Fetching registration for userId:', userId);

    await connectToDatabase();
    const registration = await BusinessRegistration.findOne({ userId }).lean();
    if (!registration) {
      return NextResponse.json({ error: 'No registration found' }, { status: 404 });
    }
    return NextResponse.json(registration);
  } catch (error) {
    console.error('[GET /api/business-registration/user]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}