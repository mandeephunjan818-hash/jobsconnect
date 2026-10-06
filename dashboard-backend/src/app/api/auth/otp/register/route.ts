import { NextRequest, NextResponse } from 'next/server';
import { User, Account, UserProfile } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import { sendOTPEmail } from '@/utils/otpEmail';
import { issueOtp, normalizeEmail } from '@/lib/otpAuth';
import { DEFAULT_ROLE } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { name, email } = await req.json();

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
        }
        const normalizedEmail = normalizeEmail(email);

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            const existingAccount = await Account.findOne({ userId: existingUser._id });
            if (existingAccount?.emailVerified) {
                return NextResponse.json(
                    { error: 'An account with this email already exists. Try signing in instead.' },
                    { status: 400 }
                );
            }
            // Unverified partial signup — allow resending a code rather than erroring
        } else {
            const user = await User.create({ email: normalizedEmail, emailVerified: null });
            await Account.create({
                userId: user._id,
                provider: 'otp',
                type: 'otp',
                providerAccountId: normalizedEmail,
                emailVerified: false,
                mfaEnabled: false,
                // password intentionally never set
            });
            await UserProfile.create({
                userId: user._id,
                name: name.trim(),
                role: DEFAULT_ROLE,
                completedOnboarding: true,
                loginCount: 0,
                permissions: [],
            });
        }

        const result = await issueOtp('register', normalizedEmail);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const sent = await sendOTPEmail(normalizedEmail, result.otp, name);
        if (!sent) {
            return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent. It expires in 5 minutes.',
        });
    } catch (error: any) {
        console.error('[otp/register] Error:', error);
        return NextResponse.json({ error: 'Internal server error. Please try again later.' }, { status: 500 });
    }
}