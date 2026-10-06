import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';

export async function GET() {
    await connectToDatabase();
    const plans = await SubscriptionPlan.find({ isActive: true })
        .sort({ price: 1 })
        .lean();
    return NextResponse.json({ plans });
}