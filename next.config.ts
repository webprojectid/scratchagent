import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/content-security-policy";
import { privateArtifactSources } from "./src/lib/public-request-policy";

const nextConfig: NextConfig = {
  // Sembunyikan fingerprint framework.
  poweredByHeader: false,
  outputFileTracingIncludes: { "/*": ["./src/db/certificates/supabase-ca.crt"] },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lobehub.com" },
      { protocol: "https", hostname: "lobechat.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "registry.npmmirror.com" },
    ],
  },
  env: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAEnBHa0BVZ4egzVD",
  },
  async rewrites() {
    return { beforeFiles: privateArtifactSources.map(source => ({ source, destination: "/api/private-artifact" })), afterFiles: [
      {
        source: "/creator/teguh-adhi-wibowo-transparent.gif",
        destination: "/creator/teguh-adhi-wibowo-animated.gif",
      },
    ], fallback: [] };
  },
  async headers() {
    return [
      ...["/api/:path*", "/project/:path*", "/profile/:path*", "/admin/:path*", "/developer-settings/:path*", "/settings/:path*", "/dashboard/:path*", ...privateArtifactSources].map(source => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: contentSecurityPolicy({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, development: process.env.NODE_ENV === "development" }) },
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
