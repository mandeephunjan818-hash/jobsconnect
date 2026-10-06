/**
 * app/api/subscription/usage/route.ts
 *
 * CHANGES:
 * - Delegates to getCurrentUsage() (lib/subscription-usage.ts) instead of
 *   re-deriving period bounds inline. This was the #1 source of the
 *   duplicate-usage-doc bug: this file used `$gte`/`$lte` range queries
 *   while the write path used exact-match queries with independently
 *   computed fallback dates. Now both paths share resolveBillingPeriod(),
 *   so a read always finds exactly the doc the write path just touched.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getCurrentUsage } from '@/lib/subscription-usage';

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const usage = await getCurrentUsage(token.id as string);
        if (!usage) return NextResponse.json({ usage: null });
        return NextResponse.json({ usage });
    } catch (err) {
        console.error('[GET /api/subscription/usage]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}