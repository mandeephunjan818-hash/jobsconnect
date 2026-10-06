// app/api/auth/signup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import { User, Account, UserProfile, VerificationToken } from '@/modal/User';
import connectToDatabase from '@/lib/mongooes';
// import { sendVerificationEmail } from '@/utils/email';
import { VALID_ROLES, DEFAULT_ROLE } from '@/lib/auth';

type AllowedRole = typeof VALID_ROLES[number];

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, email, password, role } = body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Fetch the session token ONCE
    const token = await getToken({ req });

    // 3. Role validation & security
    const requestedRole: string = role || DEFAULT_ROLE;
    if (!VALID_ROLES.includes(requestedRole as AllowedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    let finalRole: AllowedRole = DEFAULT_ROLE;

    if (requestedRole !== DEFAULT_ROLE) {
      // Only admins can create admin/sub-admin accounts
      if (!token) {
        return NextResponse.json(
          {
            error:
              'Unauthorized – you must be logged in as an administrator to create admin or sub-admin accounts.',
          },
          { status: 401 }
        );
      }
      if (token.role !== 'admin') {
        return NextResponse.json(
          {
            error: 'Forbidden – only administrators can create admin or sub-admin accounts.',
          },
          { status: 403 }
        );
      }
      finalRole = requestedRole as AllowedRole;
    }

    // 4. Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // 5. Create user, account, and profile
    const user = await User.create({
      email: normalizedEmail,
      emailVerified: null,
    });

    const account = new Account({
      userId: user._id,
      provider: 'credentials',
      providerAccountId: normalizedEmail,
      type: 'credentials',
      password, // hashed by pre‑save hook
      emailVerified: false,
      mfaEnabled: false,
    });
    await account.save();

    await UserProfile.create({
      userId: user._id,
      name: name.trim(),
      role: finalRole,
      completedOnboarding: true,
      loginCount: 0,
      permissions: [],
    });

    // 6. Generate verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await VerificationToken.create({
      identifier: normalizedEmail,
      token: hashedToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      type: 'email_verification',
    });

    // 7. Send verification email
    // await sendVerificationEmail(normalizedEmail, rawToken, name);

    // 8. Build response – include raw token only when creator is admin/sub‑admin
    const responsePayload: {
      message: string;
      userId: string;
      requiresVerification: boolean;
      token?: string;
    } = {
      message: 'User created successfully. Please check your email to verify your account.',
      userId: user._id.toString(),
      requiresVerification: true,
    };

    if (token && (token.role === 'admin' || token.role === 'sub-admin')) {
      responsePayload.token = rawToken;
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    console.error('[signup] Error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}