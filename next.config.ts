import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable instrumentation hook for server initialization
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
