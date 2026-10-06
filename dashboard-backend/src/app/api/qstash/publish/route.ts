/**
 * app/api/qstash/publish/route.ts
 *
 * Fired by QStash when a start-trigger job wakes up. Because QStash caps
 * a single publish delay at 7 days but a future-dated window can be
 * months out, this may fire as an early "checkpoint" rather than the
 * real publish time. handleDraftCheckpoint() checks `targetAt` in the
 * body against now — if it's not due yet, it re-arms another capped job
 * for the remainder; if it IS due, it runs the real promotion (draft →
 * live), including registering expiry for any windows that don't have
 * one yet and re-arming a follow-up start trigger for any windows that
 * are still future-dated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import connectToDatabase from '@/lib/mongooes';
import { handleDraftCheckpoint } from '@/lib/Listingscheduler ';

async function handler(req: NextRequest) {
    const { draftId, targetAt } = await req.json();

    if (!draftId) {
        console.error('[QStash/publish] Missing draftId in body');
        return NextResponse.json({ ok: false, error: 'missing draftId' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await handleDraftCheckpoint(draftId, targetAt);

    if (result.rescheduled) {
        console.log(`[QStash/publish] Draft ${draftId} — checkpoint re-armed, not due yet`);
    } else if (result.promoted) {
        console.log(`[QStash/publish] Draft ${draftId} — promoted`);
    }

    return NextResponse.json({ ok: true, ...result });
}

export const POST = verifySignatureAppRouter(handler);