import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Account, User } from '@/modal/User';
import { generateURI, generateSecret } from 'otplib';
import connectToDatabase from '@/lib/mongooes';
import QRCode from 'qrcode';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Get account with credentials
        const account = await Account.findOne({
            userId: session.user.id,
            provider: 'credentials'
        });

        if (!account) {
            return NextResponse.json(
                { error: 'No credentials account found' },
                { status: 400 }
            );
        }

        // Generate TOTP secret
        const secret = generateSecret();

        // Encrypt secret using Mongoose method
        const encryptedSecret = account.encryptMFASecret(secret);

        // Generate backup codes
        const backupCodes = Array.from({ length: 10 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );

        // Hash backup codes for storage
        const hashedBackupCodes = backupCodes.map(code =>
            crypto.createHash('sha256').update(code).digest('hex')
        );

        // Save temporarily
        account.mfaTempSecret = encryptedSecret;
        account.mfaTempBackupCodes = hashedBackupCodes;
        await account.save();

        // Generate QR code
        const user = await User.findById(session.user.id);
        const otpauthUrl = generateURI({
            secret: secret,
            label: user?.email || "", // Use 'label' instead of the first argument
            issuer: 'BOOMR'
        });


        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

        return NextResponse.json({
            qrCode: qrCodeUrl,
            backupCodes, // ONLY SHOWN ONCE
            secret, // For manual entry
        });

    } catch (error) {
        console.error('MFA setup error:', error);
        return NextResponse.json(
            { error: 'Failed to setup MFA' },
            { status: 500 }
        );
    }
}