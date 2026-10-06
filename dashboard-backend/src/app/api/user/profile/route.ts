import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User, UserProfile, Account } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import { revalidatePath } from 'next/cache';

// GET - Fetch user profile
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const [user, profile, account] = await Promise.all([
            User.findById(session.user.id).lean(),
            UserProfile.findOne({ userId: session.user.id }).lean(),
            Account.findOne({ 
                userId: session.user.id, 
                provider: 'credentials' 
            }).select('mfaEnabled emailVerified').lean()
        ]);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                email: user.email,
                emailVerified: user.emailVerified,
            },
            profile: profile || null,
            security: account ? {
                mfaEnabled: account.mfaEnabled,
                emailVerified: account.emailVerified,
                hasPassword: true
            } : null
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

// PATCH - Update profile
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates = await req.json();
        console.log('Received profile update request:', updates);
        const allowedUpdates = ['name','dob' ,'phone', 'timezone', 'language', 'avatar'];
        
        const filteredUpdates: any = {};
        allowedUpdates.forEach(key => {
            if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
        });

        await connectToDatabase();

        const profile = await UserProfile.findOneAndUpdate(
            { userId: session.user.id },
            { $set: { ...filteredUpdates, updatedAt: new Date() } },
            { new: true }
        );

        revalidatePath(`/user/profile/${session.user.id}`); // Revalidate to update profile info

        return NextResponse.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}