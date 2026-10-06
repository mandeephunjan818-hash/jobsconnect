/**
 * app/api/admin/audit-logs/route.ts
 *
 * GET — paginated audit log viewer
 *
 * Query params:
 *   page        number, default 1
 *   limit       number, default 20, max 100
 *   targetId    filter to a specific bundle _id or 'credit_system_config'
 *   action      filter to a specific action e.g. 'bundle.reprice'
 *   adminUserId filter to a specific admin
 *   from        ISO date string — createdAt >=
 *   to          ISO date string — createdAt <=
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import { AdminAuditLog } from '@/modal/AdminAuditLog';

export async function GET(req: NextRequest) {
    // TODO: Add admin authentication check here
    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};

    const targetId = searchParams.get('targetId');
    if (targetId) filter.targetId = targetId;

    const action = searchParams.get('action');
    if (action) filter.action = action;

    const adminUserId = searchParams.get('adminUserId');
    if (adminUserId) filter.adminUserId = adminUserId;

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
        const dateFilter: Record<string, Date> = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);
        filter.createdAt = dateFilter;
    }

    const [logs, total] = await Promise.all([
        AdminAuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        AdminAuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
        logs,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    });
}