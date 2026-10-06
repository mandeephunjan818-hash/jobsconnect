import { NextRequest, NextResponse } from 'next/server';
import { User, Account } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import { verifyOtp, normalizeEmail } from '@/lib/otpAuth';
import { SignJWT } from 'jose';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { email, otp } = await req.json();
        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
        }
        const normalizedEmail = normalizeEmail(email);

        const result = await verifyOtp('register', normalizedEmail, otp);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
        }

        await User.updateOne({ _id: user._id }, { $set: { emailVerified: new Date() } });
        await Account.updateOne(
            { userId: user._id, provider: 'otp' },
            { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
        );

        const REGISTRATION_TOKEN_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

        const registrationToken = await new SignJWT({
            userId: user._id.toString(),
            email: normalizedEmail,
            purpose: 'post-registration-login',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('2m')
            .sign(REGISTRATION_TOKEN_SECRET);

        return NextResponse.json({
            success: true,
            message: 'Email verified. Signing you in…',
            registrationToken,
        });

    } catch (error) {
        console.error('[otp/verify-registration] Error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}