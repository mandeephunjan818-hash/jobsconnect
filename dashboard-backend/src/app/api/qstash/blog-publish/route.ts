/**
 * app/api/qstash/blog-publish/route.ts
 *
 * QStash webhook — fires when a blog post's siteWindow.startAt arrives
 * for a specific site.
 *
 * Body: { postId: string, site: string }
 *
 * Idempotent: if the post was already published by the setTimeout path
 * or the window was removed, this is a no-op.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { publishBlogPostForSite } from '@/lib/blogScheduler';

async function handler(req: NextRequest) {
    const body = await req.json();
    const { postId, site } = body;

    if (!postId || typeof postId !== 'string') {
        return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }
    if (!site || typeof site !== 'string') {
        return NextResponse.json({ error: 'site required' }, { status: 400 });
    }

    await publishBlogPostForSite(postId, site);
    return NextResponse.json({ ok: true });
}

export const POST = verifySignatureAppRouter(handler);