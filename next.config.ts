import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sembunyikan fingerprint framework.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
