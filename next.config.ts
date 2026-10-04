import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The landing page is still the standalone prototype in public/.
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/landing.html" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
