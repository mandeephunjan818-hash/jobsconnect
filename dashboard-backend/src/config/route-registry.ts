/**
 * src/config/route-registry.ts
 *
 * Stage 1 — Route Classification
 *
 * Every API route is pre-classified at module load time into one of three buckets:
 *   OUTPUT  — cacheable content (listings, blog, about, services …)
 *             → s-maxage=FOREVER on the CDN, revalidate:false in the data cache
 *             → cache only clears when revalidateTag() fires (change-stream or mutation)
 *   FILTER  — query-param-dependent reads (search, filters)
 *             → no-store when ?params present, FOREVER-cached for the bare URL
 *   INPUT   — mutations that must never be cached (POST / PUT / DELETE / PATCH)
 *             → no-store always
 *
 * CACHE DURATION: UNLIMITED / TAG-ONLY
 *   revalidate is intentionally omitted from all OUTPUT entries.
 *   The middleware and cachedQuery() interpret a missing revalidate as false,
 *   which means "live forever until revalidateTag() is called".
 *   This is correct because:
 *     - The MongoDB change-stream fires within ~100 ms of any write.
 *     - Manual mutations call invalidateTags() from lib/cache.ts after every write.
 *   There is no reason to pay for a periodic re-fetch when we have push-based
 *   invalidation.
 */

export type RouteClass = 'OUTPUT' | 'FILTER' | 'INPUT';

export interface RouteConfig {
  class: RouteClass;
  /**
   * ISR revalidation window in seconds.
   * OMIT (or set to false) for tag-only invalidation — the entry lives until
   * revalidateTag() is called. This is the recommended mode when you have a
   * change-stream listener.
   */
  revalidate?: number | false;
  /**
   * Cache tags attached to every response from this route.
   * Must match the tags[] passed to unstable_cache() / cachedQuery() in the
   * handler, and the tags in COLLECTION_TAG_MAP for the change-stream.
   */
  tags?: string[];
  /**
   * When true, the presence of ?searchParams automatically downgrades this
   * route to no-store.  Always implicitly true for FILTER routes.
   */
  paramSensitive?: boolean;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY_ENTRIES: [string, RouteConfig][] = [

  // ── Public read-only content ───────────────────────────────────────────────
  // revalidate omitted → unlimited TTL, invalidated only by change-stream

  ['GET:/api/about', { class: 'OUTPUT', tags: ['about'] }],
  ['GET:/api/about/:id', { class: 'OUTPUT', tags: ['about'] }],
  ['GET:/api/about-story', { class: 'OUTPUT', tags: ['about-story'] }],

  ['GET:/api/blog', { class: 'OUTPUT', tags: ['blog'] }],
  ['GET:/api/blog/:id', { class: 'OUTPUT', tags: ['blog'] }],

  ['GET:/api/faq', { class: 'OUTPUT', tags: ['faq'] }],
  ['GET:/api/faq/:id', { class: 'OUTPUT', tags: ['faq'] }],

  ['GET:/api/services', { class: 'OUTPUT', tags: ['services'] }],
  ['GET:/api/services/:id', { class: 'OUTPUT', tags: ['services'] }],

  ['GET:/api/testimonials', { class: 'OUTPUT', tags: ['testimonials'] }],
  ['GET:/api/testimonials/:id', { class: 'OUTPUT', tags: ['testimonials'] }],

  ['GET:/api/features', { class: 'OUTPUT', tags: ['features'] }],

  ['GET:/api/contact-info', { class: 'OUTPUT', tags: ['contact-info'] }],

  // ── Listings (public browsing) ────────────────────────────────────────────

  ['GET:/api/listings', { class: 'FILTER', tags: ['listings'], paramSensitive: true }],
  ['GET:/api/listings/:id', { class: 'OUTPUT', tags: ['listings'] }],
  ['GET:/api/listings/:id/blur', { class: 'OUTPUT', tags: ['listings'] }],
  ['GET:/api/listings/my', { class: 'OUTPUT', tags: ['listings-my'] }],

  // ── Admin: listings ───────────────────────────────────────────────────────

  ['GET:/api/admin/listings', { class: 'FILTER', tags: ['admin-listings'], paramSensitive: true }],
  ['GET:/api/admin/listings/:id', { class: 'OUTPUT', tags: ['admin-listings'] }],

  // ── Admin: business registrations ─────────────────────────────────────────

  ['GET:/api/admin/business-registrations', { class: 'FILTER', tags: ['biz-reg'], paramSensitive: true }],
  ['GET:/api/admin/business-registrations/:id', { class: 'OUTPUT', tags: ['biz-reg'] }],
  ['GET:/api/admin/business-registrations/filter-options', { class: 'OUTPUT', tags: ['biz-reg-filters'] }],

  // ── Admin: buyers registration ────────────────────────────────────────────

  ['GET:/api/admin/buyers-registration', { class: 'FILTER', tags: ['buyer-reg'], paramSensitive: true }],
  ['GET:/api/admin/buyers-registration/:id', { class: 'OUTPUT', tags: ['buyer-reg'] }],
  ['GET:/api/admin/buyers-registration/filter-options', { class: 'OUTPUT', tags: ['buyer-reg-filters'] }],

  // ── Admin: metadata ───────────────────────────────────────────────────────

  ['GET:/api/admin/metadata', { class: 'OUTPUT', tags: ['metadata'] }],
  ['GET:/api/admin/metadata/:id', { class: 'OUTPUT', tags: ['metadata'] }],

  // ── Admin: users ──────────────────────────────────────────────────────────

  ['GET:/api/admin/users', { class: 'FILTER', tags: ['users'], paramSensitive: true }],
  ['GET:/api/admin/users/:userId', { class: 'OUTPUT', tags: ['users'] }],

  // ── Admin: admins / sub-admins ───────────────────────────────────────────

  ['GET:/api/admin/admins', { class: 'FILTER', tags: ['users', 'admins'], paramSensitive: true }],
  ['GET:/api/admin/admins/:userId', { class: 'OUTPUT', tags: ['users', 'admins'] }],

  // ── Pipeline / contact ────────────────────────────────────────────────────

  ['GET:/api/pipeline-crear', { class: 'OUTPUT', tags: ['pipeline'] }],
  ['GET:/api/contact', { class: 'FILTER', tags: ['contact'], paramSensitive: true }],
  ['GET:/api/contact/:id', { class: 'OUTPUT', tags: ['contact'] }],

  // ── User profile & history ────────────────────────────────────────────────
  // NOTE: profile and history are per-user so they should NOT be shared at
  // the CDN level. They are OUTPUT (data-cache only) so Next.js caches them
  // server-side but never sends cache headers that let Vercel CDN serve them
  // across different users. The handler must use uncachedJsonResponse() or
  // add 'private' to the Cache-Control header.

  ['GET:/api/user', { class: 'OUTPUT', tags: ['user-profile'] }],
  ['GET:/api/user/profile', { class: 'OUTPUT', tags: ['user-profile'] }],
  ['GET:/api/user/history', { class: 'OUTPUT', tags: ['user-history'] }],

  // ── Conversations ─────────────────────────────────────────────────────────

  ['GET:/api/conversations', { class: 'FILTER', tags: ['conversations'], paramSensitive: true }],
  ['GET:/api/conversations/:id', { class: 'OUTPUT', tags: ['conversations'] }],

  // ── Admin: subscription plans ─────────────────────────────────────────────
  ['GET:/api/admin/plans', { class: 'OUTPUT', tags: ['plans'] }],
  ['GET:/api/admin/plans/:id', { class: 'OUTPUT', tags: ['plans'] }],

  // ── All mutations are INPUT (never cached) ─────────────────────────────────

  ...([
    'POST:/api/revalidate',
    'GET:/api/revalidate',
    'POST:/api/blog',
    'PUT:/api/blog/:id',
    'DELETE:/api/blog/:id',
    'POST:/api/faq',
    'PUT:/api/faq/:id',
    'DELETE:/api/faq/:id',
    'POST:/api/services',
    'PUT:/api/services/:id',
    'DELETE:/api/services/:id',
    'POST:/api/testimonials',
    'PUT:/api/testimonials/:id',
    'DELETE:/api/testimonials/:id',
    'PUT:/api/about-story/:id',
    'PUT:/api/about/:id',
    'DELETE:/api/about/:id',
    'PUT:/api/contact-info/:id',
    'POST:/api/contact',
    'PATCH:/api/contact/:id',
    'POST:/api/contact/:id/reply',
    'POST:/api/admin/listings',
    'PUT:/api/admin/listings/:id',
    'DELETE:/api/admin/listings/:id',
    'PUT:/api/admin/listings/:id/blur',
    'POST:/api/admin/listings/import',
    'POST:/api/listings/submit',
    'PUT:/api/listings/update-request',
    'PUT:/api/listings/:id/blur',
    'POST:/api/listings/import',
    'POST:/api/admin/business-registrations',
    'PUT:/api/admin/business-registrations/:id',
    'DELETE:/api/admin/business-registrations/:id',
    'POST:/api/admin/business-registrations/bulk',
    'POST:/api/admin/business-registrations/import',
    'PUT:/api/admin/business-registrations/update-request',
    'POST:/api/admin/business-registrations/:id/agreements',
    'PUT:/api/admin/business-registrations/:id/agreements/:agreementId',
    'DELETE:/api/admin/business-registrations/:id/agreements/:agreementId',
    'POST:/api/admin/business-registrations/:id/agreements/:agreementId/send',
    'POST:/api/admin/buyers-registration',
    'PUT:/api/admin/buyers-registration/:id',
    'DELETE:/api/admin/buyers-registration/:id',
    'POST:/api/admin/buyers-registration/import',
    'PUT:/api/admin/buyers-registration/update-request',
    'POST:/api/admin/buyers-registration/:id/agreements',
    'PUT:/api/admin/buyers-registration/:id/agreements/:agreementId',
    'DELETE:/api/admin/buyers-registration/:id/agreements/:agreementId',
    'POST:/api/admin/buyers-registration/:id/agreements/:agreementId/send',
    'POST:/api/admin/metadata',
    'PUT:/api/admin/metadata/:id',
    'DELETE:/api/admin/metadata/:id',
    'POST:/api/admin/metadata/bulk',
    'POST:/api/admin/metadata/import',
    'POST:/api/admin/career',
    'POST:/api/admin/career/bulk',
    'PATCH:/api/admin/users/:userId/block',
    'PUT:/api/admin/users/:userId/permissions',
    'PATCH:/api/user/profile',
    'POST:/api/user/complete-profile',
    'POST:/api/conversations',
    'PUT:/api/conversations/:id',
    'DELETE:/api/conversations/:id',
    'POST:/api/pipeline-crear',
    'PATCH:/api/pipeline-crear',
    'POST:/api/business-registration',
    'POST:/api/buyer-register',
    'POST:/api/auth/signup',
    'POST:/api/auth/mfa/setup',
    'POST:/api/auth/mfa/verify',
    'POST:/api/admin/plans',
    'PUT:/api/admin/plans/:id',
    'DELETE:/api/admin/plans/:id',
    'POST:/api/billing/checkout',
    'POST:/api/billing/portal',
    'POST:/api/webhooks/stripe',
  ] as string[]).map((key): [string, RouteConfig] => [key, { class: 'INPUT' }]),
];

// ---------------------------------------------------------------------------
// Build the map once at module load (O(1) lookup at request time)
// ---------------------------------------------------------------------------

export const ROUTE_REGISTRY = new Map<string, RouteConfig>(REGISTRY_ENTRIES);

const _compiledPatterns: [RegExp, RouteConfig][] = REGISTRY_ENTRIES.map(
  ([pattern, config]) => {
    const re = new RegExp(
      '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/:[\w]+\*/g, '.+')
        .replace(/:[\w]+/g, '[^/]+') +
      '$',
    );
    return [re, config];
  },
);

export function lookupRoute(method: string, pathname: string): RouteConfig | undefined {
  const key = `${method.toUpperCase()}:${pathname}`;
  const exact = ROUTE_REGISTRY.get(key);
  if (exact) return exact;
  for (const [re, config] of _compiledPatterns) {
    if (re.test(key)) return config;
  }
  return undefined;
}

/**
 * Maps a MongoDB collection name to the cache tags that must be invalidated
 * when a document in that collection changes.
 *
 * Collection names are lower-cased and underscores stripped to match the
 * normalisation done in change-stream.ts.
 */
export const COLLECTION_TAG_MAP: Record<string, string[]> = {
  listings: ['listings', 'admin-listings'],
  blogs: ['blog'],
  faqs: ['faq'],
  services: ['services'],
  testimonials: ['testimonials'],
  features: ['features'],
  abouts: ['about'],
  aboutstories: ['about-story'],
  contactinfos: ['contact-info'],
  contacts: ['contact'],
  metadata: ['metadata', 'biz-reg-filters', 'buyer-reg-filters'],
  businessregistrations: ['biz-reg'],
  buyersregistrations: ['buyer-reg'],
  userprofiles: ['users', 'user-profile', 'admins'],
  conversations: ['conversations'],
  pipelinecrears: ['pipeline'],
  subscriptionplans: ['plans'],
};