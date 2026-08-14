import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Rename rute plan: /p/[planId] -> /project/[planId].
        // Link lama (/p/...) tetap dialihkan biar gak 404.
        source: "/p/:path*",
        destination: "/project/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
