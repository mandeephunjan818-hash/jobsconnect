import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';

export async function PATCH(
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

    // ── Fetch target profile before allowing block ─────
    const targetProfile = await UserProfile.findOne({ userId });
    if (!targetProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // ── Sub‑admins cannot block/unblock admins or other sub‑admins ─
    if (session.user.role === 'sub-admin' && targetProfile.role !== 'user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { isBlocked, blockReason } = body;

    if (typeof isBlocked !== 'boolean') {
      return NextResponse.json({ error: 'isBlocked must be a boolean' }, { status: 400 });
    }

    const updateData: any = { isBlocked };
    if (isBlocked) {
      updateData.blockedAt = new Date();
      if (blockReason) updateData.blockReason = blockReason;
    } else {
      updateData.blockedAt = null;
      updateData.blockReason = null;
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );

    revalidatePath(`/admin/users/${userId}`);

    return NextResponse.json({
      success: true,
      isBlocked: profile!.isBlocked,
      blockedAt: profile!.blockedAt,
      blockReason: profile!.blockReason,
    });
  } catch (error) {
    console.error('[PATCH /api/admin/users/:userId/block]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}