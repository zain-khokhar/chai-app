import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Firebase SDK imports
  transpilePackages: [],
  // Strict mode for better development
  reactStrictMode: true,
};

export default nextConfig;
