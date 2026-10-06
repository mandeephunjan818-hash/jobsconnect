import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { Account } from '@/modal/User';
import { uncachedJsonResponse } from '@/lib/cache';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return uncachedJsonResponse({ error: 'Unauthorized' }, 401);
  }

  const body = await req.json();
  const { actionToken, newPassword } = body;

  if (!actionToken || !newPassword) {
    return uncachedJsonResponse({ error: 'Missing actionToken or newPassword.' }, 400);
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return uncachedJsonResponse({ error: 'Password must be at least 8 characters.' }, 400);
  }

  // Verify the short-lived action token issued by verify-otp
  let payload: { userId: string; action: string; purpose?: string };
  try {
    const { payload: p } = await jwtVerify(actionToken, secret);
    payload = p as { userId: string; action: string };
  } catch {
    return uncachedJsonResponse(
      { error: 'Action token is invalid or has expired. Please start the process again.' },
      401
    );
  }

  // Double-check the token belongs to the authenticated user and is for 'change'
  if (payload.userId !== session.user.id) {
    return uncachedJsonResponse({ error: 'Token does not match the current session.' }, 403);
  }

  if (payload.action !== 'change' || payload.purpose !== 'account-settings') {
    return uncachedJsonResponse({ error: 'This token is not valid for changing passwords.' }, 403);
  }

  await connectToDatabase();

  const account = await Account.findOne({
    userId: new mongoose.Types.ObjectId(session.user.id),
    provider: 'credentials',
  }).select('+password');

  if (!account) {
    return uncachedJsonResponse({ error: 'No credentials account found for this user.' }, 404);
  }

  // setPassword() calls account.save() which triggers the bcrypt pre-save hook
  // on AccountSchema — no manual hashing needed here
  await account.setPassword(newPassword);

  return uncachedJsonResponse({ success: true, message: 'Password changed successfully.' });
}