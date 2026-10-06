import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

// Default scope when no specific paths/tags are given. Rename/expand this
// if "all" is meant to cover more than the static marketing pages —
// right now it does NOT touch /jobs or /jobs/[slug].
const DEFAULT_REVALIDATE_PATHS: string[] = ['/', '/about-us'];
const DEFAULT_REVALIDATE_TAGS: string[] = ['about'];

// Cache profile name required by this Next.js version's revalidateTag
// signature. 'default' is the built-in profile unless you've defined
// custom profiles via experimental.cacheLife in next.config.ts.
const CACHE_PROFILE = 'default';

type RevalidateBody = {
    all?: boolean;
    paths?: string[];
    tags?: string[];
};

function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

function getClientIP(request: NextRequest): string {
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
        const parts = xff.split(',');
        const last = parts[parts.length - 1]?.trim();
        if (last) return last;
    }
    return 'unknown';
}

// Structured log line — one JSON object per request, easy to grep/parse
// in Vercel's log viewer or any log aggregator. Never includes the raw
// secret value, only whether it matched.
function logRevalidateEvent(fields: Record<string, unknown>): void {
    console.log(JSON.stringify({
        event: 'revalidate_request',
        ...fields,
    }));
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') ?? 'unknown';
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const receivedAt = new Date().toISOString();

    // Base context logged on every outcome, success or failure.
    const baseLog = {
        requestId,
        receivedAt,
        ip: clientIP,
        userAgent,
        origin,
        referer,
        method: request.method,
        url: request.nextUrl.pathname,
    };

    if (!REVALIDATE_SECRET) {
        console.error('REVALIDATE_SECRET env variable is not set.');
        logRevalidateEvent({
            ...baseLog,
            outcome: 'server_misconfigured',
            durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
            { revalidated: false, message: 'Server misconfiguration.' },
            { status: 500 }
        );
    }

    const secret = request.headers.get('x-revalidate-secret');
    const secretValid = !!secret && safeCompare(secret, REVALIDATE_SECRET);

    if (!secretValid) {
        // Log the attempt but never the secret value itself — only
        // whether one was present, so you can spot brute-force/probing
        // traffic in the logs without turning them into a secret leak.
        logRevalidateEvent({
            ...baseLog,
            outcome: 'unauthorized',
            secretProvided: !!secret,
            durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
            { revalidated: false, message: 'Invalid secret.' },
            { status: 401 }
        );
    }

    let body: RevalidateBody = { all: true };
    let bodyParseError = false;
    try {
        const text = await request.text();
        if (text) body = JSON.parse(text) as RevalidateBody;
    } catch {
        bodyParseError = true;
        body = { all: true };
    }

    const requestedPaths = (body.paths ?? [])
        .filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
        .slice(0, 50);
    const requestedTags = (body.tags ?? [])
        .filter((t): t is string => typeof t === 'string' && t.length > 0)
        .slice(0, 50);

    const revalidatedPaths: string[] = [];
    const revalidatedTags: string[] = [];

    try {
        const revalidateAll = body.all || (!requestedPaths.length && !requestedTags.length);

        if (revalidateAll) {
            for (const path of DEFAULT_REVALIDATE_PATHS) {
                revalidatePath(path, 'page');
                revalidatedPaths.push(path);
            }
            for (const tag of DEFAULT_REVALIDATE_TAGS) {
                revalidateTag(tag, CACHE_PROFILE);
                revalidatedTags.push(tag);
            }
        } else {
            for (const path of requestedPaths) {
                revalidatePath(path, 'page');
                revalidatedPaths.push(path);
            }
            for (const tag of requestedTags) {
                revalidateTag(tag, CACHE_PROFILE);
                revalidatedTags.push(tag);
            }
        }

        const durationMs = Date.now() - startedAt;

        logRevalidateEvent({
            ...baseLog,
            outcome: 'success',
            requestedAll: !!revalidateAll,
            bodyParseError,
            revalidatedPaths,
            revalidatedTags,
            durationMs,
        });

        return NextResponse.json({
            revalidated: true,
            requestId,
            revalidatedPaths,
            revalidatedTags,
            timestamp: receivedAt,
        });
    } catch (error) {
        const durationMs = Date.now() - startedAt;
        console.error('Revalidation error:', error);
        logRevalidateEvent({
            ...baseLog,
            outcome: 'error',
            error: error instanceof Error ? error.message : String(error),
            requestedPaths,
            requestedTags,
            durationMs,
        });
        return NextResponse.json(
            { revalidated: false, message: 'Revalidation failed.', requestId },
            { status: 500 }
        );
    }
}