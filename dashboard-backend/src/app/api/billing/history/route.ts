import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { BillingHistory } from '@/modal/BillingHistory';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({
        userId: new mongoose.Types.ObjectId(token.id as string)
    }).lean();
    const customerId = profile?.subscription?.stripeCustomerId;

    if (!customerId) {
        return NextResponse.json({ history: [] });
    }

    const history = await BillingHistory.find({ stripeCustomerId: customerId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    return NextResponse.json({ history });
}