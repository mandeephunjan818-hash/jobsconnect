// app/api/admin/admins/[userId]/route.ts
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
        // Allow admin or sub-admin to view sub-admin details
        if (!session?.user || !['admin', 'sub-admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { userId } = await params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        // ── Fetch the target profile and ensure it's a sub-admin ──────────
        const targetProfile = await UserProfile.findOne({ userId }).lean();
        if (!targetProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // Only sub-admin profiles are accessible through this endpoint
        if (targetProfile.role !== 'sub-admin') {
            return NextResponse.json(
                { error: 'Forbidden – this endpoint only exposes sub‑admin accounts' },
                { status: 403 }
            );
        }

        // ── Fetch the rest of the data ──────────────────────────────────────
        const [user, loginHistory] = await Promise.all([
            User.findById(userId).lean(),
            LoginHistory.find({ userId })
                .sort({ timestamp: -1 })
                .limit(100)
                .lean(),
        ]);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            profile: targetProfile,
            loginHistory,
        });
    } catch (error) {
        console.error('[GET /api/admin/admins/:userId]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}