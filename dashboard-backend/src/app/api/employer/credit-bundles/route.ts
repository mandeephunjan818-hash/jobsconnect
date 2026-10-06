/**
 * app/api/employer/credit-bundles/route.ts
 *
 * GET — returns only active bundles with fields safe for public display.
 * No admin fields (stripeProductId etc) exposed here.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditBundle } from '@/modal/CreditBundle';
import { getCreditSystemConfig } from '@/modal/CreditSystemConfig';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const [bundles, config] = await Promise.all([
        CreditBundle.find({ isActive: true })
            .sort({ price: 1 })
            .select('key name credits price currency isActive createdAt')
            .lean(),
        getCreditSystemConfig(),
    ]);

    return NextResponse.json({
        bundles,
        listingsPerCredit: config.listingsPerCredit,
        creditExpiryDays: config.creditExpiryDays,
    });
}