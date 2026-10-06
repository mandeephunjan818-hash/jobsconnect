import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import { Account, User } from '@/modal/User';
import { uncachedJsonResponse } from '@/lib/cache';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { actionToken, newPassword } = body;
    // "email" is intentionally NOT read from the body — the verified token
    // is the only trusted source of which account this reset applies to.
    // Previously this route trusted a client-supplied email field, which let
    // anyone with a valid token for THEIR OWN account reset ANY account's
    // password by just changing the email in the request body.

    if (!actionToken || !newPassword) {
        return uncachedJsonResponse({ error: 'Missing actionToken or newPassword.' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return uncachedJsonResponse({ error: 'Password must be at least 8 characters.' }, 400);
    }

    let payload: { email?: string; action?: string; purpose?: string };
    try {
        const { payload: p } = await jwtVerify(actionToken, secret);
        payload = p as { email?: string; action?: string; purpose?: string };
    } catch {
        return uncachedJsonResponse(
            { error: 'Action token is invalid or has expired. Please start the process again.' },
            401
        );
    }

    if (payload.action !== 'change' || payload.purpose !== 'forgot-password') {
        // The purpose check rejects tokens minted by the separate, authenticated
        // account-settings OTP flow — those carry a different purpose value, so
        // they can never be accepted here even if the action string matches.
        return uncachedJsonResponse({ error: 'This token is not valid for changing passwords.' }, 403);
    }

    if (!payload.email || typeof payload.email !== 'string') {
        return uncachedJsonResponse({ error: 'Token is not valid for a password reset.' }, 403);
    }
    const normalizedEmail = payload.email.toLowerCase().trim();

    await connectToDatabase();

    const userData = await User.findOne({ email: normalizedEmail }).lean();

    if (!userData) {
        return uncachedJsonResponse({ success: false, message: 'User does not exist.' }, 404);
    }

    const account = await Account.findOne({
        userId: new mongoose.Types.ObjectId(userData._id),
        provider: 'credentials',
    }).select('+password');

    if (!account) {
        return uncachedJsonResponse({ error: 'No credentials account found for this user.' }, 404);
    }

    await account.setPassword(newPassword);

    return uncachedJsonResponse({ success: true, message: 'Password changed successfully.' });
}