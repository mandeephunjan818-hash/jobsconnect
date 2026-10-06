import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const isAnalyze = process.env.ANALYZE === 'true';

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? 'https://jobs-connect-dashboard.vercel.app';

const nextConfig: NextConfig = {

  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'luminix-assets.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'jobs-connect-dashboard.vercel.app'
      },
      {
        protocol: 'https',
        hostname: 'jobs-connect.vercel.app',
      }
    ],
    formats: ['image/webp'],
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  async rewrites() {
    return {
      beforeFiles: [
        // ── Exclusions MUST come before the generic '/api/:path*' catch-all
        //    below. Rewrites match top-to-bottom, first hit wins — these
        //    three routes are handled by THIS project's own route handlers
        //    (each verifies its own secret/signature internally), so they
        //    must never fall through to the dashboard proxy rule. ──
        {
          source: '/api/frontend/revalidate',
          destination: '/api/frontend/revalidate',
        },
        {
          source: '/api/qstash/:path*',
          destination: '/api/qstash/:path*',
        },
        {
          source: '/api/employer/:path*',
          destination: '/api/employer/:path*',
        },

        // ── Dashboard-proxied static assets ──
        {
          source: '/dash/_next/:path*',
          destination: `${DASHBOARD_URL}/_next/:path*`,
        },
        {
          source: '/dash/assets/:path*',
          destination: `${DASHBOARD_URL}/assets/:path*`,
        },
        {
          source: '/dash/images/:path*',
          destination: `${DASHBOARD_URL}/images/:path*`,
        },

        // ── Generic API catch-all — now only reachable for API routes
        //    that AREN'T one of the exclusions listed above. ──
        {
          source: '/api/:path*',
          destination: `${DASHBOARD_URL}/api/:path*`,
        },

        // ── Dashboard-proxied pages ──
        {
          source: '/auth/:path*',
          destination: `${DASHBOARD_URL}/auth/:path*`,
        },
        {
          source: '/dashboard',
          destination: `${DASHBOARD_URL}/dashboard`,
        },
        {
          source: '/dashboard/:path*',
          destination: `${DASHBOARD_URL}/dashboard/:path*`,
        },
        {
          source: '/admin/:path*',
          destination: `${DASHBOARD_URL}/admin/:path*`,
        },
        {
          source: '/media/:path*',
          destination: `${DASHBOARD_URL}/media/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default isAnalyze
  ? withBundleAnalyzer({ enabled: true })(nextConfig)
  : nextConfig;