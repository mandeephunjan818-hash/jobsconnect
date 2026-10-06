/**
 * src/app/api/admin/job-bank-requests/route.ts
 *
 * Admin route — paginated list of ALL requests + bulk actions.
 *   GET    — paginated list with filters (status, userId, search, site)
 *   DELETE — bulk delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import JobBankRequest from '@/modal/JobBankRequest';
import { User, UserProfile } from '@/modal/User';
import {
    toJobBankRequestItem,
    JobBankRequestApiResponse,
} from '@/modal/JobBankRequest.helpers';

// ─── Auth guard helper ─────────────────────────────────────────
function isAdmin(session: any): boolean {
    const role = session?.user?.role ?? 'user';
    return role === 'admin' || role === 'sub-admin';
}

// ─── GET: paginated list ───────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const status = sp.get('status') || '';
        const search = sp.get('search') || '';
        const userId = sp.get('userId') || '';
        // NEW: filter by a specific site hostname, e.g. ?site=new-jobs-fawn.vercel.app
        const site = sp.get('site') || '';
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '20', 10)));
        const sortBy = sp.get('sortBy') || 'createdAt';
        const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

        const query: any = {};
        if (status) query.status = status;
        if (userId) query.userId = userId;
        // NEW: match requests that include this site in their sites array
        if (site) query.sites = site;
        if (search) {
            query.$or = [
                { jobBankId: { $regex: search, $options: 'i' } },
                { userNotes: { $regex: search, $options: 'i' } },
                { adminNote: { $regex: search, $options: 'i' } },
                // also let admins search by partial site hostname
                { sites: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * perPage;
        const [docs, total] = await Promise.all([
            JobBankRequest.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(perPage)
                .lean(),
            JobBankRequest.countDocuments(query),
        ]);

        // Enrich with user info (name + email)
        const userIds = [...new Set(docs.map((d: any) => d.userId?.toString()))];
        const [profiles, users] = await Promise.all([
            UserProfile.find({ userId: { $in: userIds } }).select('userId name avatar').lean(),
            User.find({ _id: { $in: userIds } }).select('email').lean(),
        ]);

        const profileMap = new Map(profiles.map((p: any) => [p.userId.toString(), p]));
        const emailMap = new Map(users.map((u: any) => [u._id.toString(), u.email]));

        const enriched = docs.map((doc: any) => {
            const uid = doc.userId?.toString();
            const profile = profileMap.get(uid);
            return {
                ...toJobBankRequestItem(doc),
                userName: profile?.name ?? null,
                userEmail: emailMap.get(uid) ?? null,
                userAvatar: profile?.avatar ?? null,
            };
        });

        return NextResponse.json({
            data: enriched,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        } satisfies JobBankRequestApiResponse & { data: any[] });
    } catch (err) {
        console.error('[GET /api/admin/job-bank-requests]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: bulk delete ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();
        const { ids } = await req.json();

        if (!Array.isArray(ids) || !ids.length) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        const result = await JobBankRequest.deleteMany({ _id: { $in: ids } });

        return NextResponse.json({
            message: 'Deleted',
            deletedCount: result.deletedCount,
        });
    } catch (err) {
        console.error('[DELETE /api/admin/job-bank-requests bulk]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}