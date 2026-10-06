import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { User, Account, VerificationToken } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/auth/error?error=MissingToken', process.env.NEXTAUTH_URL));
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        await connectToDatabase();

        console.log('Verifying email with token:', hashedToken); // Log the hashed token for debugging

        // Find valid token
        const verificationRecord = await VerificationToken.findOne({
            token: hashedToken,
            type: 'email_verification',
            expires: { $gt: new Date() },
            usedAt: { $exists: false },
        });

        if (!verificationRecord) {
            return NextResponse.redirect(new URL('/auth/error?error=InvalidToken', process.env.NEXTAUTH_URL));
        }

        // Mark token as used
        await VerificationToken.updateOne(
            { _id: verificationRecord._id },
            { $set: { usedAt: new Date() } }
        );

        // Update user
        await User.updateOne(
            { email: verificationRecord.identifier },
            { $set: { emailVerified: new Date(), updatedAt: new Date() } }
        );

        // Update account
        await Account.updateOne(
            {
                providerAccountId: verificationRecord.identifier,
                provider: 'credentials'
            },
            {
                $set: {
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.redirect(new URL('/auth/sign-in?verified=true', process.env.NEXTAUTH_URL));

    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.redirect(new URL('/auth/error?error=VerificationFailed', process.env.NEXTAUTH_URL));
    }
}