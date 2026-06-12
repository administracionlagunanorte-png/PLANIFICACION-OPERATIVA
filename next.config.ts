import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-upload/:path*',
      },
    ]
  },
};

export default nextConfig;
