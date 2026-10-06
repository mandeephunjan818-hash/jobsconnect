// middleware.ts — SECURITY HARDENED v4
// v4 changes:
//  - Added SERVICE_BYPASS_PATHS (webhooks, qstash, frontend/revalidate).
//    These routes execute HERE (this project), not just proxied through
//    the frontend gateway, so this middleware must recognize them
//    independently — the gateway's bypass alone was not enough, since
//    the frontend's catch-all /api/:path* rewrite forwards unmatched
//    API calls straight back to this dashboard project.
//  - Service-bypass routes still go through rate limiting (keyed by
//    path, since there's no user/IP identity worth keying on for
//    server-to-server calls) but skip same-origin, CSRF, idempotency,
//    and the token/permission gate entirely. Authenticity for these
//    routes MUST be enforced inside the route handler itself via a
//    shared secret (x-revalidate-secret) or signature (QStash/Stripe).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import type { Permission } from "@/config/permissions";
import { PUBLIC_PERMISSION_PATTERNS } from "@/config/permissions";
import { lookupRoute, type RouteClass } from "@/config/route-registry";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
if (!SITE_URL && process.env.NODE_ENV === "production") {
  throw new Error(
    "[middleware] NEXT_PUBLIC_SITE_URL must be set in production. " +
    "All same-origin API calls will be blocked without it."
  );
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:api",
});

// Separate, more generous limiter for verified server-to-server callers
// (QStash, revalidate, webhooks). Keyed by path rather than IP/user since
// these calls come from infra, not end users — a single QStash worker or
// your own server can legitimately fire many of these per minute.
const serviceLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, "1 m"),
  analytics: true,
  prefix: "ratelimit:service",
});

const CDN_TTL = parseInt(process.env.CDN_CACHE_TTL ?? "31536000", 10);

// ── Service-to-service routes ──────────────────────────────────────────────
// Authenticated by a secret/signature INSIDE the route handler, not by
// Origin/Referer or a user session cookie. Real browsers always attach
// Origin or Referer on a same-origin mutating request; QStash callbacks,
// Stripe webhooks, and internal server-to-server fetches never do — that's
// expected for these specific paths, not suspicious.
//
// ⚠️  Every path listed here MUST verify a secret or signature in its own
//     route handler (e.g. x-revalidate-secret for revalidate, QStash's
//     Receiver.verify() for qstash, Stripe-Signature for webhooks). This
//     bypass removes the origin/CSRF/token gate — the handler becomes the
//     only remaining line of defense for these routes.
const SERVICE_BYPASS_PATHS = [
  /^\/api\/webhooks\//,
  /^\/api\/qstash\//,
  /^\/api\/frontend\/revalidate$/,
];

function isServiceBypassPath(pathname: string): boolean {
  return SERVICE_BYPASS_PATHS.some((r) => r.test(pathname));
}

function getClientIP(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return "anonymous";
}

function isValidCallbackUrl(url: string, siteUrl: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (!siteUrl) {
    console.warn("[SECURITY] NEXT_PUBLIC_SITE_URL is not set — rejecting absolute callbackUrl");
    return false;
  }
  try {
    const parsed = new URL(url);
    const site = new URL(siteUrl);
    return parsed.protocol === site.protocol && parsed.host === site.host;
  } catch {
    return false;
  }
}

function isValidHost(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  if (!host || host.length < 3) return false;
  if (host.includes("\x00") || host.includes("\n") || host.includes("\r")) return false;
  if (process.env.BLOCK_INTERNAL_IPS === "true") {
    const forwardedHost = request.headers.get("x-forwarded-host") ?? "";
    const internalIpPattern =
      /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.0\.0\.0|\[::1\]|localhost)/i;
    if (internalIpPattern.test(host) || (forwardedHost && internalIpPattern.test(forwardedHost))) {
      return false;
    }
  }
  return true;
}

// ── Allowed front-end pages ────────────────────────────────────────────────
function isAllowedPage(pathname: string): boolean {
  // Only root, /auth/*, /dashboard/*, /admin/* are permitted
  return /^\/($|auth\/|dashboard\/|admin\/|dash\/|assets\/|images\/)/.test(pathname);
}

const GOOGLE_AUTH_ORIGINS = [
  "https://accounts.google.com",
  "https://accounts.youtube.com",
  "https://auth0.com",
];
const GOOGLE_MAPS_ORIGINS = ["https://maps.googleapis.com", "https://maps.gstatic.com"];

function isGoogleAllowedOrigin(origin: string | null, pathname: string): boolean {
  if (!origin) return false;
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/auth/")) {
    return GOOGLE_AUTH_ORIGINS.some((a) => origin === a || origin.startsWith(a));
  }
  if (pathname.includes("/api/maps") || pathname.includes("/maps")) {
    return GOOGLE_MAPS_ORIGINS.some((a) => origin === a || origin.startsWith(a));
  }
  return false;
}

function buildCacheHeaders(routeClass: RouteClass, hasSearchParams = false): Record<string, string> {
  if (routeClass === "INPUT") return { "Cache-Control": "no-store, no-cache, private" };
  if (routeClass === "FILTER" && hasSearchParams) return { "Cache-Control": "no-store" };
  const cc = `public, s-maxage=${CDN_TTL}, stale-while-revalidate=${CDN_TTL}`;
  return { "Cache-Control": cc, "CDN-Cache-Control": cc, "Vercel-CDN-Cache-Control": cc };
}

function permKeyFromRequest(method: string, pathname: string): string {
  const stripped = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return `${method.toUpperCase()}:src/app/${stripped}`;
}

const _patternCache = new Map<string, RegExp>();
function compilePattern(pattern: string): RegExp {
  const cached = _patternCache.get(pattern);
  if (cached) return cached;
  let p = pattern.replace(/:path\*/g, "__STAR__");
  p = p.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  p = p.replace(/__STAR__/g, ".*");
  p = p
    .replace(/:agreementId/g, "[^/]+")
    .replace(/:listingId/g, "[^/]+")
    .replace(/:userId/g, "[^/]+")
    .replace(/:token/g, "[^/]+")
    .replace(/:id/g, "[^/]+")
    .replace(/:path/g, "[^/]+");
  const re = (() => {
    try { return new RegExp(`^${p}$`); } catch { return null; }
  })();
  const safe = re ?? new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  _patternCache.set(pattern, safe);
  return safe;
}

const _compiledPublicPatterns: RegExp[] = PUBLIC_PERMISSION_PATTERNS.map(compilePattern);
function isPublicRoute(concreteKey: string): boolean {
  return _compiledPublicPatterns.some((re) => re.test(concreteKey));
}
function hasPermission(userPermissions: readonly string[], requiredKey: string): boolean {
  return userPermissions.some((p) => compilePattern(p).test(requiredKey));
}

function applyOutputHeaders(res: NextResponse, cacheHeaders: Record<string, string>, tags: string[] | undefined): void {
  for (const [k, v] of Object.entries(cacheHeaders)) res.headers.set(k, v);
  if (tags?.length) res.headers.set("x-cache-tags", tags.join(","));
}

function applySecurityHeaders(res: NextResponse, nonce: string): void {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), serial=(), bluetooth=()"
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://cdn.socket.io https://www.gstatic.com https://www.google.com https://services.leadconnectorhq.com https://stcdn.leadconnectorhq.com https://widgets.leadconnectorhq.com https://www.youtube.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com https://cdn.jsdelivr.net`,
      "frame-src 'self' https://widgets.leadconnectorhq.com https://www.youtube.com https://www.google.com",
      "img-src 'self' https://assets.cdn.filesafe.space https://widgets.leadconnectorhq.com data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com https://maps.gstatic.com https://*.fbcdn.net https://*.cdninstagram.com https://*.twimg.com https://*.linkedin.com https://*.pinimg.com https://*.slack-edge.com https://*.telegram.org",
      "font-src 'self' https://fonts.bunny.net https://widgets.leadconnectorhq.com data: https://fonts.gstatic.com https://*.tinymce.com https://*.tiny.cloud",
      "style-src 'self' https://fonts.bunny.net https://stcdn.leadconnectorhq.com https://widgets.leadconnectorhq.com 'unsafe-inline' https://fonts.googleapis.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com",
      "connect-src 'self' https://cdn.jsdelivr.net https://stcdn.leadconnectorhq.com https://services.msgsndr.com https://services.leadconnectorhq.com https://widgets.leadconnectorhq.com wss: https://accounts.google.com https://www.youtube.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com https://graph.facebook.com https://api.twitter.com https://api.linkedin.com",
      "media-src 'self' https://widgets.leadconnectorhq.com https://res.cloudinary.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
    ].join("; ")
  );
}

function addCorsHeadersIfNeeded(res: NextResponse, request: NextRequest): void {
  const origin = request.headers.get("origin");
  const allowedOrigins = [SITE_URL].filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
}

const ALLOWED_BOTS: Record<string, { label: string; allowApi: boolean }> = {
  googlebot: { label: "Google", allowApi: false },
  bingbot: { label: "Bing", allowApi: false },
  yandexbot: { label: "Yandex", allowApi: false },
  duckduckbot: { label: "DuckDuckGo", allowApi: false },
  facebookexternalhit: { label: "Facebook", allowApi: false },
  whatsapp: { label: "WhatsApp", allowApi: false },
  twitterbot: { label: "Twitter", allowApi: false },
  linkedinbot: { label: "LinkedIn", allowApi: false },
  telegrambot: { label: "Telegram", allowApi: false },
  slackbot: { label: "Slack", allowApi: false },
};

const MONITORING_UA_PATTERNS = ["chrome-lighthouse", "google page speed", "pagespeed"];

function getBotMatch(userAgent: string): { label: string; allowApi: boolean } | null {
  const ua = userAgent.toLowerCase();
  for (const [key, value] of Object.entries(ALLOWED_BOTS)) {
    if (ua.includes(key)) return value;
  }
  return null;
}

function isKnownBadBot(userAgent: string): boolean {
  const BAD_BOTS = [
    "ahrefsbot", "semrushbot", "dotbot", "mj12bot", "blexbot", "serpstatbot",
    "petalbot", "zgrab", "masscan", "nuclei", "sqlmap", "nikto", "gobuster",
    "dirbuster", "wfuzz", "burp", "nessus", "openvas", "wapiti", "skipfish", "w3af", "arachni",
  ];
  const ua = userAgent.toLowerCase();
  return BAD_BOTS.some((b) => ua.includes(b));
}

function isMonitoringAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return MONITORING_UA_PATTERNS.some((p) => ua.includes(p));
}

function isHeadlessOrAutomation(userAgent: string): boolean {
  const patterns = ["headlesschrome", "headless", "phantomjs", "selenium", "puppeteer", "playwright", "cypress", "webdriver"];
  const ua = userAgent.toLowerCase();
  return patterns.some((p) => ua.includes(p));
}

function detectExtensionInjection(request: NextRequest): { blocked: boolean; reason?: string } {
  const headers = request.headers;
  const suspiciousHeaders = ["x-extension-id", "x-extension-version", "x-browser-extension", "x-extension-installed"];
  for (const h of suspiciousHeaders) {
    const val = headers.get(h);
    if (val && val !== "XMLHttpRequest") return { blocked: true, reason: `Suspicious header: ${h}=${val}` };
  }
  const secFetchMode = headers.get("sec-fetch-mode");
  const isMutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  if (secFetchMode === "no-cors" && request.nextUrl.pathname.startsWith("/api/") && isMutatingMethod) {
    return { blocked: true, reason: "no-cors fetch mode not allowed on mutating requests" };
  }
  const suspiciousParams = ["jsonp", "___x", "__proto__"];
  for (const param of suspiciousParams) {
    if (request.nextUrl.searchParams.has(param) && request.nextUrl.pathname.startsWith("/api/")) {
      return { blocked: true, reason: `Suspicious query parameter: ${param}` };
    }
  }
  return { blocked: false };
}

function validateSecFetchHeaders(request: NextRequest): { valid: boolean; reason?: string } {
  const userAgent = request.headers.get("user-agent") ?? "";
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (getBotMatch(userAgent)) return { valid: true };
  const isServerSideCall = !request.headers.get("origin") && !request.headers.get("referer");
  if (isServerSideCall) return { valid: true };
  const validSites = ["same-origin", "same-site", "cross-site", "none"];
  if (secFetchSite && !validSites.includes(secFetchSite)) return { valid: false, reason: "Invalid sec-fetch-site value" };
  return { valid: true };
}

async function hasWalletAccount(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${SITE_URL}/api/employer/credits/wallet`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    const hasActivity =
      (data?.totalPurchased ?? 0) > 0 ||
      (data?.totalSpent ?? 0) > 0 ||
      (data?.totalExpired ?? 0) > 0 ||
      (data?.batches?.length ?? 0) > 0;
    return hasActivity;
  } catch (err) {
    console.warn("[middleware] wallet check failed — failing open:", err);
    return true; // don't hard-block if the wallet service is down
  }
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const hasParams = request.nextUrl.search.length > 1;
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") ?? "";
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (!isValidHost(request)) return new NextResponse(null, { status: 400 });

  // ── Service-to-service bypass ──────────────────────────────────────────
  // Runs before EVERYTHING else that assumes a browser/session context:
  // same-origin check, extension-injection heuristics, bot filtering,
  // rate limiting keyed by user/IP, idempotency, CSRF, and the /api/*
  // token+permission gate. These routes are verified inside their own
  // handlers via secret/signature instead.
  if (isServiceBypassPath(pathname)) {
    let rl = { success: true, remaining: 999 };
    try {
      rl = await serviceLimiter.limit(`path:${pathname}`);
    } catch (err) {
      console.warn("[middleware] Redis unavailable on service route — failing open:", err);
    }
    if (!rl.success) {
      const res = NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      applySecurityHeaders(res, nonce);
      return res;
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(res, nonce);
    return res;
  }

  if (pathname === '/dashboard/wallet-payments/credits' || pathname === '/dashboard/wallet-payments/wallet' || pathname === '/dashboard/wallet-payments/activity') {
    const res = NextResponse.next();
    res.headers.set('Clear-Site-Data', '"cache"');
    return res;
  }

  const extCheck = detectExtensionInjection(request);
  if (extCheck.blocked) {
    console.warn(`[SECURITY] Blocked request from ${clientIP}: ${extCheck.reason}`);
    const res = new NextResponse(
      JSON.stringify({ error: "Request blocked", code: "SUSPICIOUS_REQUEST" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
    applySecurityHeaders(res, nonce);
    return res;
  }

  const secFetchCheck = validateSecFetchHeaders(request);
  if (!secFetchCheck.valid) {
    console.warn(`[SECURITY] Invalid sec-fetch from ${clientIP}: ${secFetchCheck.reason}`);
  }

  if (userAgent) {
    if (isKnownBadBot(userAgent)) return new NextResponse(null, { status: 403 });
    if (isMonitoringAgent(userAgent)) {
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      applySecurityHeaders(res, nonce);
      return res;
    }
    const bot = getBotMatch(userAgent);
    if (bot) {
      if (pathname.startsWith("/api/") && !bot.allowApi) return new NextResponse(null, { status: 403 });
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      applySecurityHeaders(res, nonce);
      return res;
    }
    if (/bot|crawler|spider|scraper/i.test(userAgent)) return new NextResponse(null, { status: 403 });
    if (isHeadlessOrAutomation(userAgent)) return new NextResponse(null, { status: 403 });
  }

  // ── B2. Same-origin enforcement ────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const isServerSideCall = !origin && !referer;
    const isSameOrigin =
      (origin && SITE_URL && origin === SITE_URL) ||
      (referer && SITE_URL && referer.startsWith(SITE_URL));
    const isGoogleAllowed = isGoogleAllowedOrigin(origin, pathname);
    const isGoogleReferer = referer ? GOOGLE_AUTH_ORIGINS.some((a) => referer.startsWith(a)) : false;

    if (!isServerSideCall && !isSameOrigin && !isGoogleAllowed && !isGoogleReferer && method !== "OPTIONS") {
      const res = NextResponse.json({ error: "Cross-origin API calls are not allowed" }, { status: 403 });
      applySecurityHeaders(res, nonce);
      return res;
    }
  }

  if (pathname.startsWith("/api/") && method === "OPTIONS") {
    const allowedOrigins = [SITE_URL].filter(Boolean);
    const isGooglePreflight = isGoogleAllowedOrigin(origin, pathname);
    if ((origin && allowedOrigins.includes(origin)) || isGooglePreflight) {
      const res = new NextResponse(null, { status: 204 });
      if (origin) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Access-Control-Allow-Credentials", "true");
      }
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Idempotency-Key");
      applySecurityHeaders(res, nonce);
      return res;
    }
  }

  const routeConfig = lookupRoute(method, pathname);
  const routeClass: RouteClass = routeConfig?.class ?? "INPUT";
  const cacheHeaders = buildCacheHeaders(routeClass, hasParams);
  const permKey = permKeyFromRequest(method, pathname);

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (pathname.startsWith("/api/auth/")) {
    let rateLimitResult = { success: true, remaining: 999 };
    try {
      rateLimitResult = await authLimiter.limit(clientIP);
    } catch (err) {
      console.error("[middleware] Redis unavailable on auth route — failing closed:", err);
      const res = NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
      applySecurityHeaders(res, nonce);
      return res;
    }
    if (!rateLimitResult.success) {
      const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
      res.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      applySecurityHeaders(res, nonce);
      return res;
    }
  }

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    const rateLimitKey = token?.sub ? `user:${token.sub}` : `ip:${clientIP}`;
    let rateLimitResult = { success: true, remaining: 999 };
    try {
      rateLimitResult = await apiLimiter.limit(rateLimitKey);
    } catch (err) {
      console.warn("[middleware] Redis unavailable on API route — failing open:", err);
    }
    if (!rateLimitResult.success) {
      const res = NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      res.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      applySecurityHeaders(res, nonce);
      return res;
    }
  }

  // ── Public routes ──────────────────────────────────────────────────────────
  if (isPublicRoute(permKey)) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applyOutputHeaders(res, cacheHeaders, routeConfig?.tags);
    applySecurityHeaders(res, nonce);
    addCorsHeadersIfNeeded(res, request);
    return res;
  }

  // ── H5. Idempotency guard ──────────────────────────────────────────────────
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && pathname.startsWith("/api/")) {
    const idemKey = request.headers.get("idempotency-key");
    if (idemKey) {
      const idemScope = token?.sub ? `user:${token.sub}` : `ip:${clientIP}`;
      const idemRedisKey = `idem:${idemScope}:${idemKey}`;
      const exists = await redis.get(idemRedisKey);
      if (exists) {
        const res = NextResponse.json({ error: "Duplicate request", status: 409 });
        applySecurityHeaders(res, nonce);
        return res;
      }
      redis.set(idemRedisKey, "1", { ex: 10 }).catch(() => { });
    }
  }

  // ── CSRF guard ──────────────────────────────────────────────────────────
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && pathname.startsWith("/api/")) {
    if (token) {
      if (!origin && !referer) {
        const res = NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
        applySecurityHeaders(res, nonce);
        return res;
      }
    } else if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
      const res = NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
      applySecurityHeaders(res, nonce);
      return res;
    }
  }

  // ── /admin/* role guard ─────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const url = new URL("/auth/sign-in", request.url);
      const callbackUrl = pathname;
      if (isValidCallbackUrl(callbackUrl, SITE_URL)) url.searchParams.set("callbackUrl", callbackUrl);
      const res = NextResponse.redirect(url);
      applySecurityHeaders(res, nonce);
      return res;
    }

    if (token.isBlocked) {
      const res = NextResponse.redirect(new URL("/auth/sign-in?blocked=true", request.url));
      applySecurityHeaders(res, nonce);
      return res;
    }

    const role = (token.role as string | undefined) ?? "";
    if (role !== "admin" && role !== "sub-admin") {
      console.warn(`[SECURITY] Admin access denied for user ${token.sub} with role "${role}" on ${pathname}`);
      const res = NextResponse.redirect(new URL("/", request.url));
      applySecurityHeaders(res, nonce);
      return res;
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Cache-Control", "no-store, private");
    applySecurityHeaders(res, nonce);
    return res;
  }

  // ── 🔒 /dashboard authentication guard with onboarding & plan check ──
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const url = new URL("/auth/sign-in", request.url);
      if (isValidCallbackUrl(pathname, SITE_URL)) {
        url.searchParams.set("callbackUrl", pathname);
      }
      const res = NextResponse.redirect(url);
      applySecurityHeaders(res, nonce);
      return res;
    }

    if (token.isBlocked) {
      const url = new URL("/auth/sign-in?blocked=true", request.url);
      const res = NextResponse.redirect(url);
      applySecurityHeaders(res, nonce);
      return res;
    }

    if (token.needsOnboarding && pathname !== "/auth/onboarding") {
      const url = new URL("/auth/onboarding", request.url);
      const res = NextResponse.redirect(url);
      applySecurityHeaders(res, nonce);
      return res;
    }

    if (!pathname.startsWith("/dashboard/wallet-payments")) {
      const hasAccount = await hasWalletAccount(request);
      if (!hasAccount) {
        const url = new URL("/dashboard/wallet-payments/credits", request.url);
        url.searchParams.set("needAccount", "true");
        const res = NextResponse.redirect(url);
        applySecurityHeaders(res, nonce);
        return res;
      }
    }

    if (pathname === '/dashboard') {
      const url = new URL('/dashboard/listings', request.url);
      const res = NextResponse.redirect(url);
      applySecurityHeaders(res, nonce);
      return res;
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Cache-Control", "no-store, private");
    applySecurityHeaders(res, nonce);
    return res;
  }

  // ── /api/* permission checks ───────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (!token) {
      const res = NextResponse.json({ error: "Unauthorized", required: permKey }, { status: 401 });
      applySecurityHeaders(res, nonce);
      return res;
    }
    if (token.isBlocked) {
      const res = NextResponse.json({ error: "Account suspended" }, { status: 403 });
      applySecurityHeaders(res, nonce);
      return res;
    }
    if (!token.permissions) {
      const res = NextResponse.json(
        { error: "Forbidden", message: "Session outdated", code: "TOKEN_REFRESH_REQUIRED" },
        { status: 403 }
      );
      applySecurityHeaders(res, nonce);
      return res;
    }
    const userPermissions = token.permissions as Permission[];
    if (!hasPermission(userPermissions, permKey)) {
      const res = NextResponse.json({ error: "Forbidden", required: permKey, userRole: token.role }, { status: 403 });
      applySecurityHeaders(res, nonce);
      return res;
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applyOutputHeaders(res, cacheHeaders, routeConfig?.tags);
    applySecurityHeaders(res, nonce);
    addCorsHeadersIfNeeded(res, request);
    return res;
  }

  // ── Page guard: only auth, dashboard, admin, and root are allowed ────────
  if (!isAllowedPage(pathname)) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url, 307);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(res, nonce);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};