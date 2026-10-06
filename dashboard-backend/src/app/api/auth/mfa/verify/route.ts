import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Account } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
import { verify } from 'otplib';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code } = await req.json();

        if (!code || code.length !== 6) {
            return NextResponse.json(
                { error: 'Invalid code format' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const account = await Account.findOne({
            userId: session.user.id,
            provider: 'credentials'
        });

        if (!account?.mfaTempSecret) {
            return NextResponse.json(
                { error: 'MFA setup not initiated' },
                { status: 400 }
            );
        }

        // Decrypt and verify
        const secret = account.decryptMFASecret(account.mfaTempSecret);
        const isValid = verify({ token: code, secret });

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        // Enable MFA
        account.mfaEnabled = true;
        account.mfaSecret = account.mfaTempSecret;
        account.mfaBackupCodes = account.mfaTempBackupCodes;
        account.mfaEnabledAt = new Date();
        account.mfaTempSecret = undefined;
        account.mfaTempBackupCodes = undefined;
        await account.save();

        return NextResponse.json({ 
            success: true,
            message: 'MFA enabled successfully',
            enabled: true 
        });

    } catch (error) {
        console.error('MFA verification error:', error);
        return NextResponse.json(
            { error: 'Failed to verify MFA' },
            { status: 500 }
        );
    }
}