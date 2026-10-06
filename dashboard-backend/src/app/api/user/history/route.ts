// app/api/user/history/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LoginHistory, LogoutHistory } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        await connectToDatabase();

        // Get total counts for pagination
        const [totalLoginCount, totalLogoutCount] = await Promise.all([
            LoginHistory.countDocuments({ userId: session.user.id }),
            LogoutHistory.countDocuments({ userId: session.user.id })
        ]);

        // Fetch paginated records
        const [loginRecords, logoutRecords] = await Promise.all([
            LoginHistory.find({ userId: session.user.id })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            LogoutHistory.find({ userId: session.user.id })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        return NextResponse.json({
            success: true,
            loginHistory: loginRecords,
            logoutHistory: logoutRecords,
            pagination: {
                page,
                limit,
                totalLogin: totalLoginCount,
                totalLogout: totalLogoutCount,
                totalPages: Math.ceil((totalLoginCount + totalLogoutCount) / limit)
            }
        });
    } catch (error) {
        console.error('History fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch history' },
            { status: 500 }
        );
    }
}