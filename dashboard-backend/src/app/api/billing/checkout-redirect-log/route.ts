// app/api/billing/checkout-redirect-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { CheckoutRedirectLog } from '@/modal/CheckoutRedirectLog';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { checkoutSessionId, status, queryParams, pendingPlanKey, userAgent, ip } = await req.json();
    if (!checkoutSessionId || !status) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await CheckoutRedirectLog.create({
        userId: new mongoose.Types.ObjectId(token.id),
        checkoutSessionId,
        status,
        queryParams,
        pendingPlanKey: pendingPlanKey || undefined,
        userAgent: userAgent || undefined,
        ip: ip || undefined,
    });

    return NextResponse.json({ success: true });
}