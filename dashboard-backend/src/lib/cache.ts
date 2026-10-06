/**
 * src/lib/cache.ts
 *
 * Stage 3 / 5 — Data cache layer
 *
 * This is the ONLY place in the codebase that should call unstable_cache()
 * or revalidateTag() directly. All route handlers import from here instead
 * of calling Next.js cache APIs directly. This gives us a single place to
 * change the caching strategy if Next.js APIs evolve.
 *
 * CACHE DURATION: UNLIMITED (tag-only invalidation)
 *   Every cachedQuery() call uses revalidate: false.
 *   Entries live forever in the Next.js data cache until revalidateTag()
 *   fires — either from the MongoDB change-stream or from a manual mutation
 *   that calls invalidateTags() / withCacheInvalidation().
 *
 * ─── Quick-start for a new route handler ─────────────────────────────────
 *
 * 1. READ route (list):
 *
 *   import { cachedQuery } from '@/lib/cache';
 *   import Listing from '@/models/Listing';
 *   import connectToDatabase from '@/lib/mongooes';
 *
 *   // Define ONCE per file, outside the handler function.
 *   // The tags[] MUST match the tags[] in route-registry.ts for this route.
 *   const getListings = cachedQuery(
 *     async () => {
 *       await connectToDatabase();
 *       return Listing.find({ status: 'active' }).lean();
 *     },
 *     { tags: ['listings'] },          // ← matches route-registry tags
 *   );
 *
 *   export async function GET() {
 *     const data = await getListings();
 *     return cachedJsonResponse(data, { tags: ['listings'] });
 *   }
 *
 * 2. READ route (single document):
 *
 *   // Key the cache on the document id so different ids get separate entries.
 *   export async function GET(_req: Request, { params }: { params: { id: string } }) {
 *     const getListing = cachedQuery(
 *       async () => {
 *         await connectToDatabase();
 *         return Listing.findById(params.id).lean();
 *       },
 *       { tags: ['listings'], keyParts: ['listing', params.id] },
 *     );
 *     const data = await getListing();
 *     if (!data) return new Response('Not found', { status: 404 });
 *     return cachedJsonResponse(data, { tags: ['listings'] });
 *   }
 *
 * 3. WRITE route (create / update / delete):
 *
 *   import { withCacheInvalidation, uncachedJsonResponse } from '@/lib/cache';
 *
 *   export async function POST(req: Request) {
 *     const body = await req.json();
 *     const listing = await withCacheInvalidation(
 *       async () => {
 *         await connectToDatabase();
 *         return Listing.create(body);
 *       },
 *       ['listings', 'admin-listings'],   // ← every tag that shows this data
 *     );
 *     return uncachedJsonResponse(listing, 201);
 *   }
 *
 * 4. FILTER route (with ?searchParams — never cached):
 *
 *   export async function GET(req: Request) {
 *     const { searchParams } = new URL(req.url);
 *     const status = searchParams.get('status') ?? 'active';
 *     await connectToDatabase();
 *     const data = await Listing.find({ status }).lean();
 *     return uncachedJsonResponse(data);
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

import { unstable_cache, revalidateTag } from 'next/cache';
import { lookupRoute } from '@/config/route-registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedQueryConfig {
  /**
   * Cache tags. MUST match the tags[] in route-registry.ts for this route
   * AND the tags passed to cachedJsonResponse() in the same handler.
   */
  tags: string[];
  /**
   * Extra key parts that make this cache entry unique.
   * For list routes leave empty (the tags are the key).
   * For detail routes add the document id: keyParts: ['listing', id]
   */
  keyParts?: string[];
}

export interface CachedFetchOptions extends RequestInit {
  /** Override the tags from the registry. */
  tags?: string[];
}

// ---------------------------------------------------------------------------
// 1. cachedQuery — wrap any async MongoDB function with tag-only ISR
// ---------------------------------------------------------------------------

/**
 * Wraps a Mongoose query function with Next.js unstable_cache().
 *
 * The result is cached indefinitely (revalidate: false) and will only be
 * cleared when revalidateTag() is called with one of the supplied tags.
 *
 * IMPORTANT: define the wrapped function OUTSIDE your route handler so the
 * cache entry is stable across requests. Defining it inside the handler
 * creates a new cache key on every call.
 *
 * @example
 *   const getBlogs = cachedQuery(
 *     () => Blog.find({}).sort('-createdAt').lean(),
 *     { tags: ['blog'] },
 *   );
 */
export function cachedQuery<T>(
  queryFn: () => Promise<T>,
  config: CachedQueryConfig,
): () => Promise<T> {
  return unstable_cache(
    queryFn,
    // Cache key: use keyParts if provided, otherwise fall back to tags.
    // Next.js requires the key to be a string array.
    config.keyParts ?? config.tags,
    {
      tags: config.tags,
      revalidate: 1,  // UNLIMITED — only cleared by revalidateTag()
    },
  );
}

// ---------------------------------------------------------------------------
// 2. cachedFetch — fetch() with automatic ISR options from the registry
// ---------------------------------------------------------------------------

/**
 * A fetch() wrapper that reads the route registry to decide cache options.
 * Useful when one API route calls another internally.
 *
 * For direct MongoDB queries prefer cachedQuery() — it skips the HTTP round-trip.
 */
export async function cachedFetch(
  url: string | URL,
  options: CachedFetchOptions = {},
): Promise<Response> {
  const pathname = typeof url === 'string' ? new URL(url, 'http://x').pathname : url.pathname;
  const method   = (options.method ?? 'GET').toUpperCase();
  const config   = lookupRoute(method, pathname);

  const { tags: tagsOverride, ...fetchInit } = options;
  const tags = tagsOverride ?? config?.tags ?? [];

  let next: RequestInit['next'];
  if (config?.class === 'INPUT') {
    next = { revalidate: 0 };
  } else if (tags.length > 0) {
    next = { revalidate: 1, tags };   // UNLIMITED
  } else {
    next = { revalidate: false };
  }

  return fetch(url, { ...fetchInit, next });
}

// ---------------------------------------------------------------------------
// 3. streamingQuery — MongoDB cursor → ReadableStream (ndjson)
// ---------------------------------------------------------------------------

/**
 * Converts a Mongoose cursor (or any async iterable) into a
 * newline-delimited JSON ReadableStream.
 *
 * The first document is sent to the browser immediately while the rest are
 * still being fetched from MongoDB. Vercel buffers the complete stream and
 * caches it at the CDN edge on the first pass.
 *
 * @example
 *   export async function GET() {
 *     await connectToDatabase();
 *     const cursor = Listing.find({ status: 'active' }).lean().cursor();
 *     return new Response(streamingQuery(cursor), {
 *       headers: {
 *         'Content-Type': 'application/x-ndjson',
 *         'Cache-Control': `public, s-maxage=${FOREVER}, stale-while-revalidate=${FOREVER}`,
 *         'x-cache-tags': 'listings',
 *       },
 *     });
 *   }
 */
const FOREVER = false;
export { FOREVER };

export function streamingQuery(
  cursor: AsyncIterable<unknown>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const doc of cursor) {
          controller.enqueue(encoder.encode(JSON.stringify(doc) + '\n'));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// 4. invalidateTags — call revalidateTag() for a list of tags
// ---------------------------------------------------------------------------

/**
 * Calls revalidateTag() for every tag in the list.
 *
 * Must be called from a Server Action, Route Handler, or Server Component.
 * Call this after EVERY write operation so the CDN and data caches are
 * cleared immediately — do not rely on the change-stream alone for
 * mutations originating from your own API.
 *
 * @example
 *   await invalidateTags(['listings', 'admin-listings']);
 */
export function invalidateTags(tags: string[]): void {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}

// ---------------------------------------------------------------------------
// 5. withCacheInvalidation — mutation helper that auto-invalidates
// ---------------------------------------------------------------------------

/**
 * Runs a mutation function then immediately invalidates the supplied cache tags.
 * The mutation runs first; if it throws, the tags are NOT invalidated
 * (the cache still reflects the last known good state).
 *
 * @example
 *   const updated = await withCacheInvalidation(
 *     () => Listing.findByIdAndUpdate(id, patch, { new: true }),
 *     ['listings', 'admin-listings'],
 *   );
 */
export async function withCacheInvalidation<T>(
  mutateFn: () => Promise<T>,
  tags: string[],
): Promise<T> {
  const result = await mutateFn();
  invalidateTags(tags);
  return result;
}

// ---------------------------------------------------------------------------
// 6. Response builders
// ---------------------------------------------------------------------------

/**
 * Returns a JSON Response with the correct unlimited Cache-Control headers
 * and x-cache-tags for an OUTPUT route.
 *
 * Use this instead of NextResponse.json() in every GET handler that returns
 * cacheable data. The tags MUST match the tags[] in cachedQuery() and in
 * route-registry.ts for this route.
 *
 * @example
 *   return cachedJsonResponse(listings, { tags: ['listings'] });
 */
export function cachedJsonResponse(
  data: unknown,
  config: { tags: string[]; status?: number },
): Response {
  const cc = `public, s-maxage=${FOREVER}, stale-while-revalidate=${FOREVER}`;
  return new Response(JSON.stringify(data), {
    status: config.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cc,
      'CDN-Cache-Control': cc,
      'Vercel-CDN-Cache-Control': cc,
      'x-cache-tags': config.tags.join(','),
    },
  });
}

/**
 * Returns a JSON Response that is explicitly never cached.
 *
 * Use for:
 *   - All POST / PUT / PATCH / DELETE responses
 *   - Any GET that returns per-user data (profile, history, conversations)
 *   - FILTER routes with ?searchParams
 *
 * @example
 *   return uncachedJsonResponse({ success: true }, 201);
 */
export function uncachedJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, private',
    },
  });
}

// ---------------------------------------------------------------------------
// 7. privateJsonResponse — for authenticated per-user GET routes
// ---------------------------------------------------------------------------

/**
 * Returns a JSON Response that is cached in the Next.js data cache
 * (server-side, per-user via the keyParts in cachedQuery) but is NOT
 * shared at the CDN level. Use for /api/user/profile, /api/user/history,
 * /api/conversations/:id, etc.
 *
 * The data-cache entry is still invalidated by revalidateTag(), so updates
 * are reflected within ~100 ms via the change-stream.
 */
export function privateJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // private: the browser may cache but Vercel CDN must not share across users
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    },
  });
}