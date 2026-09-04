import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/manage", destination: "/config", permanent: true },
      {
        source: "/manage/:path*",
        destination: "/config/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
