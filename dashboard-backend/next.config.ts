import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {

  // assetPrefix: 'https://jobs-connect.vercel.app/dash',
   assetPrefix: '/dash',

  // ✅ Only use serverExternalPackages (remove the old key)

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        // Add other Node.js modules as needed
      };
    }
    return config;
  },

  serverExternalPackages: [
    'mongoose',
    '@ayocore/exceljs',
    'unzipper',
    '@aws-sdk/client-s3',
    'archiver',           // add this – it also uses fs
  ],
  images: {
    // ❌ remove 'domains' – keep only remotePatterns
    contentDispositionType: 'inline',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        }],
      },
      {
        source: '/media/:path*',
        headers: [{
          key: 'Cache-Control',
          value: 'public, max-age=86400, stale-while-revalidate=604800',
        }],
      },
    ];
  },

  // ❌ remove typedRoutes – not valid in Next.js 15
  sassOptions: {
    includePaths: [path.join(__dirname, "src/styles")],
    silenceDeprecations: ["import", "color-functions", "global-builtin"],
  },
};

export default nextConfig;