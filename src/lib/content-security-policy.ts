export function contentSecurityPolicy({ supabaseUrl, development = false }: { supabaseUrl?: string; development?: boolean } = {}): string {
  const connections = new Set(["'self'", "https://challenges.cloudflare.com", "https://prod.spline.design", "https://unpkg.com", "https://www.gstatic.com", "https://apis.spline.design", "https://relayserver.spline.design", "wss://relayserver.spline.design"]);
  if (supabaseUrl) {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" && !(development && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Supabase CSP origin must use HTTPS.");
    connections.add(url.origin);
    connections.add(`${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`);
  }
  if (development) { connections.add("ws://localhost:*"); connections.add("ws://127.0.0.1:*"); }
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://unpkg.com https://www.gstatic.com${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://cdn.simpleicons.org https://cdn.sanity.io https://lobehub.com https://lobechat.com https://avatars.githubusercontent.com https://registry.npmmirror.com https://lh3.googleusercontent.com https://prod.spline.design",
    `connect-src ${[...connections].join(" ")}`,
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
