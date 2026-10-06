import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import Listing from '@/modal/Listing';
import mongoose from 'mongoose';

/**
 * Toggle public visibility of a LIVE listing (isActive).
 * Drafts have no isActive flag — this route only ever touches
 * the Listing collection, never ListingDraft.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id || session.user.email;
        if (!userId)
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

        const data = await params;
        const id = data.id;
        if (!mongoose.Types.ObjectId.isValid(id))
            return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });

        await connectToDatabase();

        const listing = await (Listing as any).findOne({
            _id: new mongoose.Types.ObjectId(id),
            submittedBy: userId,
        });

        if (!listing)
            return NextResponse.json(
                { error: 'Listing not found or you do not have permission to update it.' },
                { status: 404 },
            );

        // Accept an explicit value, otherwise just flip current state
        let nextValue: boolean;
        try {
            const body = await req.json();
            nextValue = typeof body?.isActive === 'boolean' ? body.isActive : !listing.isActive;
        } catch {
            nextValue = !listing.isActive;
        }

        listing.isActive = nextValue;
        listing.adminNotes.push({
            message: `Listing ${nextValue ? 'shown' : 'hidden'} by owner.`,
            type: 'status_change',
            createdAt: new Date(),
            createdBy: String(userId),
        });
        await listing.save();

        // Revalidate public pages so the change reflects immediately
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${listing.slug}`] }),
        }).catch(() => { });

        return NextResponse.json({
            message: `Listing is now ${nextValue ? 'visible' : 'hidden'}.`,
            isActive: listing.isActive,
        });
    } catch (error) {
        console.error('[PATCH /api/listings/[id]/toggle]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}