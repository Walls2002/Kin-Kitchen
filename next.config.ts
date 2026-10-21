import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: { browserToTerminal: false },
  // The section is called Inventory; its pages live under /ingredients.
  async redirects() {
    return [
      { source: "/inventory", destination: "/ingredients", permanent: false },
      { source: "/inventory/:path*", destination: "/ingredients/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
