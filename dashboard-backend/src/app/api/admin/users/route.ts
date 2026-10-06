// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { User, UserProfile } from '@/modal/User';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const buildToken = process.env.BUILD_SECRET_TOKEN;

    if (buildToken && authHeader === `Bearer ${buildToken}`) {
      // Proceed to fetch data
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'sub-admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(50, parseInt(searchParams.get('perPage') || '10'));
    const search = searchParams.get('search') || '';
    const isBlocked = searchParams.get('isBlocked'); // 'true', 'false', or null
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const skip = (page - 1) * perPage;

    // Only basic users — role is fixed, not client-controlled
    const profileQuery: any = { role: 'user' };
    if (isBlocked !== null && isBlocked !== '') {
      profileQuery.isBlocked = isBlocked === 'true';
    }

    if (search) {
      const usersMatchingEmail = await User.find(
        { email: { $regex: search, $options: 'i' } },
        { _id: 1 }
      ).lean();
      const userIds = usersMatchingEmail.map(u => u._id);

      profileQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    const profiles = await UserProfile.find(profileQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(perPage)
      .lean();

    const userIds = profiles.map(p => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();

    const combined = profiles.map(profile => {
      const user = users.find(u => u._id.toString() === profile.userId.toString());
      return {
        id: profile.userId,
        email: user?.email,
        name: profile.name,
        role: profile.role,
        isBlocked: profile.isBlocked,
        blockedAt: profile.blockedAt,
        blockReason: profile.blockReason,
        lastLoginAt: profile.lastLoginAt,
        loginCount: profile.loginCount,
        createdAt: user?.createdAt,
        updatedAt: profile.updatedAt,
      };
    });

    const total = await UserProfile.countDocuments(profileQuery);

    return NextResponse.json({
      data: combined,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error('[GET /api/admin/users]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}