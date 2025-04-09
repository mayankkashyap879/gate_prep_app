// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // swcMinify is deprecated in Next.js 15+
  images: {
    domains: ['localhost'],
  },
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack(config) {
    return config;
  },
};

export default nextConfig;