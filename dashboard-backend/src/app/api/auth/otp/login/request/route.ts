import { NextRequest, NextResponse } from 'next/server';
import { User, Account } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import { sendOTPEmail } from '@/utils/otpEmail';
import { issueOtp, normalizeEmail } from '@/lib/otpAuth';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }
        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({ email: normalizedEmail }).lean();
        const account = user
            ? await Account.findOne({ userId: user._id, provider: 'otp' }).lean()
            : null;

        // No account at all with this email -> tell the frontend to send them to register
        if (!user || !account) {
            return NextResponse.json(
                { error: 'No account found with this email.', notRegistered: true },
                { status: 404 }
            );
        }

        // Account exists but email was never verified -> resend verification instead of login OTP
        if (!account.emailVerified) {
            return NextResponse.json(
                { error: 'Please verify your email before logging in.', needsVerification: true },
                { status: 403 }
            );
        }

        const result = await issueOtp('login', normalizedEmail);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        await sendOTPEmail(normalizedEmail, result.otp, 'there');
        return NextResponse.json({ success: true, message: 'A login code has been sent to your email.' });
    } catch (error) {
        console.error('[otp/login/request] Error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}