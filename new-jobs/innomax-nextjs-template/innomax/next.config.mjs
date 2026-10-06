/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["cdn.shopify.com", "jobs-connect.vercel.app", "jobs-connect-dashboard.vercel.app", "res.cloudinary.com"],
  },
  experimental: {
    // missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
