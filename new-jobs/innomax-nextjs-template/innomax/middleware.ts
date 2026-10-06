// middleware.ts — FRONTEND GATEWAY (New in Canada Jobs — no dashboard/admin/auth proxy)

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

// Kept even though this site has no dashboard proxy: /api/blog-comments
// (and any other same-origin fetches from server actions) still need
// SITE_URL to be a trusted origin. DASHBOARD_URL is harmless to keep in
// case any future cross-site admin action calls this site's /api/* routes.
const TRUSTED_ORIGINS = [SITE_URL, DASHBOARD_URL].filter(Boolean);

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "ratelimit:api",
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

// No /dash/ bypass — this site does not proxy a dashboard.
// /media/ kept because public job/blog images are rewritten to Cloudinary
// via next.config.ts. Remove this line too if that rewrite doesn't exist here.
const BYPASS_PREFIXES = [
    /^\/media\//,
    /^\/_next\/image\//,
    /^\/_next\/static\//,
    /^\/_next\/webpack-hmr/,
];

function shouldBypass(pathname: string): boolean {
    if (STATIC_EXTENSIONS.test(pathname)) return true;
    return BYPASS_PREFIXES.some((r) => r.test(pathname));
}

// Public storefront pages only — no /auth, /dashboard, /admin, /dash/assets.
// Add /auth/ back here later if this site ever needs its own sign-in flow
// (e.g. "Apply Now" requiring an account) without a full dashboard.
const ALLOWED_PAGE_PATTERNS: RegExp[] = [
    /^\/$/,
    /^\/about-us\/?$/,
    /^\/contact-us\/?$/,
    /^\/blogs\/?$/,
    /^\/blogs\/[^/]+$/,
    /^\/jobs\/?$/,
    /^\/jobs\/[^/]+$/,
];

function isAllowedPage(pathname: string): boolean {
    return ALLOWED_PAGE_PATTERNS.some((re) => re.test(pathname));
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
            "img-src 'self' https://jobs-connect.vercel.app https://assets.cdn.filesafe.space https://widgets.leadconnectorhq.com data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com https://maps.gstatic.com https://*.fbcdn.net https://*.cdninstagram.com https://*.twimg.com https://*.linkedin.com https://*.pinimg.com https://*.slack-edge.com https://*.telegram.org",
            "font-src 'self' https://fonts.bunny.net https://widgets.leadconnectorhq.com data: https://fonts.gstatic.com https://*.tinymce.com https://*.tiny.cloud",
            "style-src 'self' https://fonts.bunny.net https://stcdn.leadconnectorhq.com https://widgets.leadconnectorhq.com 'unsafe-inline' https://fonts.googleapis.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com",
            "connect-src 'self' https://cdn.jsdelivr.net https://stcdn.leadconnectorhq.com https://services.msgsndr.com https://services.leadconnectorhq.com https://widgets.leadconnectorhq.com wss: https://accounts.google.com https://www.youtube.com https://*.tinymce.com https://*.tiny.cloud https://maps.googleapis.com https://graph.facebook.com https://api.twitter.com https://api.linkedin.com",
            "media-src 'self' https://widgets.leadconnectorhq.com https://res.cloudinary.com https://jobs-connect.vercel.app",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; ")
    );
}

// ── Main Middleware ─────────────────────────────────────
export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    // ═══════════════════════════════════════════════════════
    // 0. Bypass: static assets & Cloudinary-proxied media
    // ═══════════════════════════════════════════════════════
    if (shouldBypass(pathname)) {
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
    //    Kept for server-action same-origin fetches, e.g.
    //    getBlogComments() -> ${SITE_URL}/api/blog-comments
    //    which is rewritten to DASHBOARD_URL in next.config.ts.
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
    // 3. Page guard – only allowed storefront pages
    //    No /auth, /dashboard, /admin on this site (for now).
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

// ── Bot helpers ─────────────────────────────────────────
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