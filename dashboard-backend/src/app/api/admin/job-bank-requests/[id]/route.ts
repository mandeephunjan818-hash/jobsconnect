/**
 * src/app/api/admin/job-bank-requests/[id]/route.ts
 *
 * Single request admin actions.
 *   GET    — fetch one request (with user info)
 *   PUT    — update status / link listing / add admin note / override sites
 *   DELETE — delete single request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import JobBankRequest, { KNOWN_SITES } from '@/modal/JobBankRequest';
import { User, UserProfile } from '@/modal/User';
import { toJobBankRequestItem } from '@/modal/JobBankRequest.helpers';
import type { JobBankRequestStatus } from '@/modal/JobBankRequest';

interface Params {
    params: Promise<{ id: string }>;
}

function isAdmin(session: any): boolean {
    const role = session?.user?.role ?? 'user';
    return role === 'admin' || role === 'sub-admin';
}

const VALID_STATUSES: JobBankRequestStatus[] = [
    'pending',
    'processing',
    'fulfilled',
    'rejected',
    'duplicate',
];

// ─── GET: single request ───────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        await connectToDatabase();

        const doc = await JobBankRequest.findById(id).lean();
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Enrich with user info
        const uid = (doc as any).userId?.toString();
        const [profile, user] = await Promise.all([
            UserProfile.findOne({ userId: uid }).select('name avatar').lean(),
            User.findById(uid).select('email').lean(),
        ]);

        return NextResponse.json({
            data: {
                ...toJobBankRequestItem(doc as any),
                userName: (profile as any)?.name ?? null,
                userEmail: (user as any)?.email ?? null,
                userAvatar: (profile as any)?.avatar ?? null,
            },
        });
    } catch (err) {
        console.error('[GET /api/admin/job-bank-requests/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PUT: update status / link listing / override sites ────────
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const adminId = (session.user as any).id;

        await connectToDatabase();

        const doc = await JobBankRequest.findById(id);
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const body = await req.json();
        const { status, listingId, listingCollection, adminNote, sites } = body;

        // ── Validate & apply status ─────────────────────────────
        if (status !== undefined) {
            if (!VALID_STATUSES.includes(status)) {
                return NextResponse.json(
                    { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
                    { status: 400 },
                );
            }
            doc.status = status;
        }

        // ── Link listing ────────────────────────────────────────
        if (listingId !== undefined) {
            doc.listingId = listingId || null;
        }
        if (listingCollection !== undefined) {
            doc.listingCollection = listingCollection || null;
        }

        // ── Admin note ──────────────────────────────────────────
        if (adminNote !== undefined) {
            doc.adminNote = adminNote?.trim() || undefined;
        }

        // ── Sites override (admin can correct the user's selection) ─
        if (sites !== undefined) {
            if (!Array.isArray(sites)) {
                return NextResponse.json(
                    { error: 'sites must be an array of hostname strings.' },
                    { status: 400 },
                );
            }
            const unknown = (sites as string[]).filter(
                (s) => !(KNOWN_SITES as readonly string[]).includes(s),
            );
            if (unknown.length > 0) {
                return NextResponse.json(
                    { error: `Unknown site(s): ${unknown.join(', ')}` },
                    { status: 400 },
                );
            }
            doc.sites = sites as string[];
        }

        // ── Track reviewer ──────────────────────────────────────
        doc.reviewedBy = adminId;
        doc.reviewedAt = new Date();

        await doc.save();

        return NextResponse.json({ data: toJobBankRequestItem(doc.toObject()) });
    } catch (err) {
        console.error('[PUT /api/admin/job-bank-requests/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: single delete ─────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        await connectToDatabase();

        const doc = await JobBankRequest.findByIdAndDelete(id);
        if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('[DELETE /api/admin/job-bank-requests/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}