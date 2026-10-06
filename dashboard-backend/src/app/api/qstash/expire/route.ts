/**
 * app/api/qstash/expire/route.ts
 *
 * Fired by QStash when an expiry job wakes up. Because QStash caps a
 * single publish delay at 7 days but our windows can run for months,
 * this may fire as an early "checkpoint" rather than the real expiry
 * time. handleExpiryCheckpoint() checks `targetAt` in the body against
 * now — if it's not due yet, it re-arms another capped job for the
 * remainder; if it IS due, it runs the real expiry (remove the site
 * from the listing, move to draft if none remain).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import connectToDatabase from '@/lib/mongooes';
import { handleExpiryCheckpoint } from '@/lib/Listingscheduler ';

async function handler(req: NextRequest) {
  const { slug, site, targetAt } = await req.json();

  if (!slug || !site) {
    console.error(`[QStash/expire] Missing slug or site in body: slug="${slug}" site="${site}"`);
    return NextResponse.json({ ok: false, error: 'missing slug or site' }, { status: 400 });
  }

  await connectToDatabase();

  const result = await handleExpiryCheckpoint(slug, site, targetAt);

  if (result.rescheduled) {
    console.log(`[QStash/expire] slug="${slug}" site="${site}" — checkpoint re-armed, not due yet`);
  } else if (result.expired) {
    console.log(`[QStash/expire] slug="${slug}" site="${site}" — expired`);
  }

  return NextResponse.json({ ok: true, ...result });
}

export const POST = verifySignatureAppRouter(handler);