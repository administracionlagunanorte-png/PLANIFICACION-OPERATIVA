import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
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
