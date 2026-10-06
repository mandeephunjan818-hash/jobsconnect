// src/app/api/users/route.ts
// Lightweight user list for blur pickers (no sensitive data exposed).
// Only accessible to authenticated users with an approved BusinessRegistration.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { User, UserProfile } from '@/modal/User';
import BusinessRegistration from '@/modal/BusinessRegistration';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id || session.user.email;
    const userRole = (session.user as any).role ?? 'user';
    const isAdmin = userRole === 'admin' || userRole === 'sub-admin';

    await connectToDatabase();

    // Only approved sellers can fetch the user list (for blur targeting)
    if (!isAdmin) {
      const registration = await BusinessRegistration.findOne({ userId: currentUserId });
      if (!registration || registration.status !== 'approved') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(100, parseInt(sp.get('perPage') ?? '50', 10)));

    // Build query on UserProfile (has name + userId)
    const profileQuery: any = { userId: { $ne: currentUserId } }; // exclude self
    if (search) {
      profileQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * perPage;

    const profiles = await UserProfile.find(profileQuery)
      .select('userId name')
      .sort({ name: 1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    // Fetch emails from User collection
    const userIds = profiles.map((p: any) => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('email').lean();
    const emailMap = new Map(users.map((u: any) => [u._id.toString(), u.email]));

    const data = profiles.map((p: any) => ({
      id: p.userId.toString(),
      name: p.name,
      email: emailMap.get(p.userId.toString()) || '',
      avatar: p.avatar || null,
    }));

    const total = await UserProfile.countDocuments(profileQuery);

    return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
  } catch (error) {
    console.error('[GET /api/users]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}