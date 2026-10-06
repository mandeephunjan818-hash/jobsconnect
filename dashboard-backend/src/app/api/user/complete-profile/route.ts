import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserProfile } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { dob, phone, timezone } = await req.json();

        if (!dob) {
            return NextResponse.json(
                { error: 'Date of birth is required' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        await UserProfile.findOneAndUpdate(
            { userId: session.user.id },
            {
                $set: {
                    dob,
                    phone: phone || undefined,
                    timezone: timezone || 'UTC',
                    completedOnboarding: true,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        revalidatePath(`/user/profile/${session.user.id}`); // Revalidate to update profile info

        return NextResponse.json({ 
            success: true,
            message: 'Profile completed successfully' 
        });

    } catch (error) {
        console.error('Profile completion error:', error);
        return NextResponse.json(
            { error: 'Failed to complete profile' },
            { status: 500 }
        );
    }
}