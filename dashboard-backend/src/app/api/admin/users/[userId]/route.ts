import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { User, UserProfile, LoginHistory } from '@/modal/User';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // ── Allow both admin and sub-admin ─────────────────
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'sub-admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { userId } = await params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const [user, profile, loginHistory] = await Promise.all([
      User.findById(userId).lean(),
      UserProfile.findOne({ userId }).lean(),
      LoginHistory.find({ userId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Sub‑admins can only view users with role 'user' ─
    if (session.user.role === 'sub-admin' && profile?.role !== 'user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: profile || null,
      loginHistory,
    });
  } catch (error) {
    console.error('[GET /api/admin/users/:userId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}