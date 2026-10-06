/**
 * src/app/api/job-bank-requests/[id]/route.ts
 *
 * Single request actions for the requesting user.
 *   GET    — fetch one of the current user's requests (includes sites field)
 *   DELETE — withdraw a pending request (cannot withdraw once fulfilled)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import JobBankRequest from '@/modal/JobBankRequest';
import { toJobBankRequestItem } from '@/modal/JobBankRequest.helpers';

interface Params {
    params: Promise<{ id: string }>;
}

// ─── GET: single request ───────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const userId = (session.user as any).id;

        await connectToDatabase();

        const doc = await JobBankRequest.findOne({ _id: id, userId }).lean();
        if (!doc) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ data: toJobBankRequestItem(doc) });
    } catch (err) {
        console.error('[GET /api/job-bank-requests/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: withdraw pending request ─────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const userId = (session.user as any).id;

        await connectToDatabase();

        const doc = await JobBankRequest.findOne({ _id: id, userId });
        if (!doc) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (doc.status !== 'pending') {
            return NextResponse.json(
                {
                    error: `Cannot withdraw a request with status "${doc.status}". Only pending requests can be withdrawn.`,
                },
                { status: 400 },
            );
        }

        await doc.deleteOne();

        return NextResponse.json({ message: 'Request withdrawn successfully' });
    } catch (err) {
        console.error('[DELETE /api/job-bank-requests/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}