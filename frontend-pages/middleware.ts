// middleware.ts — FRONTEND GATEWAY v3
// v3 changes:
//  - Service-bypass paths (webhooks, qstash, frontend/revalidate) now
//    ALSO go through rate limiting before being let through, instead of
//    skipping straight to NextResponse.next(). A completely unlimited
//    bypass is a resource-exhaustion risk even if the handler ultimately
//    rejects unsigned requests — the rate limiter keeps that rejection
//    cheap at scale.
//  - Reminder: these paths must be excluded from the blanket
//    `/api/:path* -> DASHBOARD_URL/api/:path*` rewrite in next.config.ts
//    if they're meant to be handled by THIS project rather than proxied
//    to the dashboard. See note at the bottom of this file.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
if (!SITE_URL && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be set in production.");
}

const DASHBOARD_URL =
    process.env.DASHBOARD_URL?.replace(/\/$/, "") ??
    "https://jobs-connect-dashboard.vercel.app";
const TRUSTED_ORIGINS = [SITE_URL, DASHBOARD_URL].filter(Boolean);

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const authLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    prefix: "ratelimit:auth",
});

const apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "ratelimit:api",
});

// Generous, path-keyed limiter for verified server-to-server callers.
const serviceLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, "1 m"),
    prefix: "ratelimit:service",
});

// ── Helpers ─────────────────────────────────────────────
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

const STATIC_EXTENSIONS =
    /\.(ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|woff2?|ttf|eot|map|txt|xml|json|pdf|zip)$/i;

const BYPASS_PREFIXES = [
    /^\/dash\//,
    /^\/media\//,
    /^\/_next\/image\//,
    /^\/_next\/static\//,
    /^\/_next\/webpack-hmr/,
];

function shouldBypass(pathname: string): boolean {
    if (STATIC_EXTENSIONS.test(pathname)) return true;
    return BYPASS_PREFIXES.some((r) => r.test(pathname));
}

const ALLOWED_PAGE_PATTERNS: RegExp[] = [
    /^\/$/,
    /^\/about-us\/?$/,
    /^\/contact-us\/?$/,
    /^\/blog\/?$/,
    /^\/blog\/[^/]+$/,
    /^\/jobs\/?$/,
    /^\/jobs\/[^/]+$/,
    /^\/auth\//,
    /^\/dashboard\/?/,
    /^\/admin\//,
    /^\/dash\/assets\//,
];

function isAllowedPage(pathname: string): boolean {
    return ALLOWED_PAGE_PATTERNS.some((re) => re.test(pathname));
}

// ── Service-to-service bypass ────────────────────────────
// Stripe, QStash, and internal revalidate calls arrive with no browser
// UA, no Origin, and no Referer — all three trigger blocks in the normal
// path. We pass them straight through (after rate limiting); the route
// handler itself verifies the Stripe-Signature / QStash signature /
// x-revalidate-secret.
const SERVICE_BYPASS_PATHS = [
    /^\/api\/webhooks\//,
    /^\/api\/qstash\//,
    /^\/api\/frontend\/revalidate$/,
];

function isServiceBypassPath(pathname: string): boolean {
    return SERVICE_BYPASS_PATHS.some((r) => r.test(pathname));
}

function applySecurityHeaders(res: NextResponse): void {
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
    );
    res.headers.set(
        "Permissions-Policy",
        "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()"
    );
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Resource-Policy", "same-site");
    res.headers.set(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.socket.io https://www.gstatic.com https://www.google.com https://services.leadconnectorhq.com https://stcdn.leadconnectorhq.com https://widgets.leadconnectorhq.com https://www.youtube.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com https://cdn.jsdelivr.net",
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

// ── Main Middleware ─────────────────────────────────────
export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    // ═══════════════════════════════════════════════════════
    // 0. Bypass: static assets & dashboard proxied resources
    // ═══════════════════════════════════════════════════════
    if (shouldBypass(pathname)) {
        const res = NextResponse.next();
        applySecurityHeaders(res);
        return res;
    }

    // ═══════════════════════════════════════════════════════
    // 0.5. Bypass: sign-in form POST to /
    // ═══════════════════════════════════════════════════════
    if (
        method === "POST" &&
        pathname === "/" &&
        request.headers.get("referer")?.startsWith(`${SITE_URL}/auth/sign-in`)
    ) {
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════
    // Service-to-service bypass — must come before bot check
    // and before the CSRF / rate-limit logic inside the /api/
    // branch below. Still rate-limited (by path) to keep an
    // unauthenticated flood cheap even before the handler's
    // own secret/signature check runs.
    // ═══════════════════════════════════════════════════════
    if (isServiceBypassPath(pathname)) {
        let rl = { success: true, remaining: 999 };
        try {
            rl = await serviceLimiter.limit(`path:${pathname}`);
        } catch (err) {
            console.warn("[middleware] Redis down on service route — failing open:", err);
        }
        if (!rl.success) {
            const res = NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
            res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
            applySecurityHeaders(res);
            return res;
        }
        const res = NextResponse.next();
        applySecurityHeaders(res);
        return res;
    }

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get("user-agent") ?? "";
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const requestHeaders = new Headers(request.headers);

    // 1. Bot protection
    if (userAgent) {
        if (isKnownBadBot(userAgent)) return new NextResponse(null, { status: 403 });
        if (isMonitoringAgent(userAgent)) {
            const res = NextResponse.next({ request: { headers: requestHeaders } });
            applySecurityHeaders(res);
            return res;
        }
        const bot = getBotMatch(userAgent);
        if (bot) {
            if (pathname.startsWith("/api/") && !bot.allowApi)
                return new NextResponse(null, { status: 403 });
            const res = NextResponse.next({ request: { headers: requestHeaders } });
            applySecurityHeaders(res);
            return res;
        }
        if (/bot|crawler|spider|scraper/i.test(userAgent))
            return new NextResponse(null, { status: 403 });
        if (isHeadlessOrAutomation(userAgent))
            return new NextResponse(null, { status: 403 });
    }

    // ═══════════════════════════════════════════════════════
    // 2. API route specific handling
    // ═══════════════════════════════════════════════════════
    if (pathname.startsWith("/api/")) {
        const isServerSideCall = !origin && !referer;
        const isTrustedOrigin =
            (origin && TRUSTED_ORIGINS.includes(origin)) ||
            (referer && TRUSTED_ORIGINS.some((o) => referer.startsWith(o)));

        if (!isServerSideCall && !isTrustedOrigin && method !== "OPTIONS") {
            const res = NextResponse.json(
                { error: "Cross-origin API calls are not allowed" },
                { status: 403 }
            );
            applySecurityHeaders(res);
            return res;
        }

        if (method === "OPTIONS") {
            const res = new NextResponse(null, { status: 204 });
            if (origin && TRUSTED_ORIGINS.includes(origin)) {
                res.headers.set("Access-Control-Allow-Origin", origin);
                res.headers.set("Access-Control-Allow-Credentials", "true");
            }
            res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
            res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Idempotency-Key");
            applySecurityHeaders(res);
            return res;
        }

        if (pathname.startsWith("/api/auth/")) {
            let rateLimitResult = { success: true, remaining: 999 };
            try {
                rateLimitResult = await authLimiter.limit(clientIP);
            } catch (err) {
                console.error("[middleware] Redis down on auth — failing closed:", err);
                const res = NextResponse.json(
                    { error: "Service temporarily unavailable" },
                    { status: 503 }
                );
                applySecurityHeaders(res);
                return res;
            }
            if (!rateLimitResult.success) {
                const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
                res.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
                applySecurityHeaders(res);
                return res;
            }
        } else {
            let rateLimitResult = { success: true, remaining: 999 };
            try {
                rateLimitResult = await apiLimiter.limit(clientIP);
            } catch (err) {
                console.warn("[middleware] Redis down on API — failing open:", err);
            }
            if (!rateLimitResult.success) {
                const res = NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
                res.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
                applySecurityHeaders(res);
                return res;
            }
        }

        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            if (!origin && !referer) {
                const res = NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
                applySecurityHeaders(res);
                return res;
            }
        }

        const res = NextResponse.next({ request: { headers: requestHeaders } });
        applySecurityHeaders(res);
        return res;
    }

    // ═══════════════════════════════════════════════════════
    // 3. Page guard – only allowed front-end pages
    // ═══════════════════════════════════════════════════════
    if (!isAllowedPage(pathname)) {
        const res = NextResponse.redirect(new URL("/", request.url), 307);
        applySecurityHeaders(res);
        return res;
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(res);
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

// ── Bot helpers (unchanged) ────────────────────────────
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

function getBotMatch(ua: string): { label: string; allowApi: boolean } | null {
    const lower = ua.toLowerCase();
    for (const [key, value] of Object.entries(ALLOWED_BOTS)) {
        if (lower.includes(key)) return value;
    }
    return null;
}

function isKnownBadBot(ua: string): boolean {
    const BAD_BOTS = [
        "ahrefsbot", "semrushbot", "dotbot", "mj12bot", "blexbot", "serpstatbot",
        "petalbot", "zgrab", "masscan", "nuclei", "sqlmap", "nikto", "gobuster",
        "dirbuster", "wfuzz", "burp", "nessus", "openvas", "wapiti", "skipfish",
        "w3af", "arachni",
    ];
    const lower = ua.toLowerCase();
    return BAD_BOTS.some((b) => lower.includes(b));
}

function isMonitoringAgent(ua: string): boolean {
    const lower = ua.toLowerCase();
    return MONITORING_UA_PATTERNS.some((p) => lower.includes(p));
}

function isHeadlessOrAutomation(ua: string): boolean {
    const patterns = [
        "headlesschrome", "headless", "phantomjs", "selenium",
        "puppeteer", "playwright", "cypress", "webdriver",
    ];
    const lower = ua.toLowerCase();
    return patterns.some((p) => lower.includes(p));
}

// ═══════════════════════════════════════════════════════════
// ⚠️  next.config.ts note (not part of this file):
// The catch-all rewrite `source: '/api/:path*' -> DASHBOARD_URL/api/:path*`
// will forward /api/qstash/* and /api/frontend/revalidate to the dashboard
// project unless you add explicit exclusions ABOVE that rule, e.g.:
//   { source: '/api/qstash/:path*', destination: '/api/qstash/:path*' }
//   { source: '/api/frontend/revalidate', destination: '/api/frontend/revalidate' }
// Rewrites match top-to-bottom and stop at the first hit, so these must be
// listed before the generic '/api/:path*' entry in `beforeFiles`.
// ═══════════════════════════════════════════════════════════