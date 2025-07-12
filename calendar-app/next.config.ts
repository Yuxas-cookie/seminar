import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Supabase Edge Functionsはビルド時に無視
    ignoreBuildErrors: false,
  },
  eslint: {
    // ビルド時にlintを無視しない
    ignoreDuringBuilds: false,
  }
};

export default nextConfig;
