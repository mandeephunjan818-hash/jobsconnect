/**
 * src/app/api/revalidate/route.ts
 *
 * Stage 4 — Vercel Tag Invalidation
 *
 * This Route Handler receives POST requests from:
 *   a) The MongoDB change-stream listener (Stage 6) running as a separate
 *      long-lived process / Vercel Cron job.
 *   b) Any server-side mutation that needs to bust the cache immediately
 *      (e.g. admin creating a new listing via the dashboard).
 *
 * Security: requests must carry the REVALIDATE_SECRET header.
 *
 * When called, it:
 *   1. Validates the secret.
 *   2. Calls revalidateTag() for each tag in the payload.
 *   3. Returns a JSON summary of what was invalidated.
 *
 * Both page HTML and API JSON responses that were tagged with the same tag
 * are invalidated simultaneously — no separate page/API bust needed.
 *
 * Example payload:
 *   {
 *     "tags": ["listings", "admin-listings"],
 *     "reason": "listing:66abc123 updated via change-stream"
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export const runtime = 'nodejs'; // revalidateTag requires nodejs runtime

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-revalidate-secret');
  if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse payload ──────────────────────────────────────────────────────
  let body: { tags?: string[]; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tags = body.tags;
  if (!Array.isArray(tags) || tags.length === 0) {
    return NextResponse.json({ error: 'tags[] is required' }, { status: 400 });
  }

  // ── 3. Invalidate ─────────────────────────────────────────────────────────
  const invalidated: string[] = [];
  const failed: string[] = [];

  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.trim() === '') continue;
    try {
      revalidateTag(tag.trim());
      invalidated.push(tag.trim());
    } catch (err) {
      console.error(`[revalidate] Failed to invalidate tag "${tag}":`, err);
      failed.push(tag.trim());
    }
  }

  console.log(
    `[revalidate] Invalidated ${invalidated.length} tags: ${invalidated.join(', ')}` +
    (body.reason ? ` | reason: ${body.reason}` : ''),
  );

  return NextResponse.json({
    invalidated,
    failed,
    reason: body.reason ?? null,
    timestamp: new Date().toISOString(),
  });
}

// Health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', endpoint: '/api/revalidate' });
}