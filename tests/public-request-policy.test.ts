import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import nextConfig from "../next.config";
import { tryToParsePath } from "next/dist/lib/try-to-parse-path";
import { GET as blockedArtifact } from "../src/app/api/private-artifact/route";

test("private files stay unreachable even when copied into public assets", () => {
  for (const path of ["/.env", "/.env.local", "/.git/config", "/nested/AGENTS.md", "/artifacts/run.json", "/.tmp-audit/report.json", "/backup/export.sql", "/docs/security/audit.md", "/private.key", "/capture.har", "/%2eenv.local", "/nested%5c.env", "/broken%ZZ"]) {
    const result = proxy(new NextRequest(`https://example.test${path}`));
    assert.equal(result.status, 404, path);
    assert.equal(result.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(result.headers.get("x-middleware-next"), null);
  }
});

test("private API and account responses cannot enter shared caches", () => {
  for (const path of ["/api/plans/example", "/api/llm-config", "/project/example", "/profile", "/admin/security"]) {
    const result = proxy(new NextRequest(`https://example.test${path}`));
    assert.equal(result.headers.get("x-middleware-next"), "1");
    for (const name of ["cdn-cache-control", "vercel-cdn-cache-control"]) assert.equal(result.headers.get(name), "no-store");
    assert.match(result.headers.get("cache-control")!, /private, no-store/);
  }
});

test("brand assets, public documentation and login flows remain available", () => {
  for (const path of ["/", "/login", "/auth/callback", "/docs", "/docs/cli", "/icons/tabler/key.svg", "/.well-known/security.txt", "/og-image.jpg"]) {
    const result = proxy(new NextRequest(`https://example.test${path}`));
    assert.equal(result.headers.get("x-middleware-next"), "1", path);
    assert.equal(result.headers.get("cache-control"), null, path);
  }
});

test("native before-files routing blocks private files independently of proxy support", async () => {
  const rewrites = await nextConfig.rewrites!();
  assert.ok(!Array.isArray(rewrites));
  const patterns = rewrites.beforeFiles!.map(route => {
    const parsed = tryToParsePath(route.source);
    assert.equal(parsed.error, undefined);
    assert.equal(route.destination, "/api/private-artifact");
    return new RegExp(parsed.regexStr!, "i");
  });
  for (const path of ["/.env.local", "/nested/AGENTS.md", "/.git/config", "/artifacts/run.json", "/backup/export.sql", "/docs/security/audit.md", "/docs/PROJECT-HANDOFF.md"]) assert.ok(patterns.some(pattern => pattern.test(path)), path);
  for (const path of ["/", "/docs", "/docs/cli", "/login", "/api/plans/list", "/icons/tabler/key.svg"]) assert.equal(patterns.some(pattern => pattern.test(path)), false, path);
  assert.equal(blockedArtifact().status, 404);
  const headers = await nextConfig.headers!();
  for (const path of ["/api/plans/example", "/profile", "/project/example", "/admin/security", "/developer-settings"]) {
    assert.ok(headers.some(route => new RegExp(tryToParsePath(route.source).regexStr!, "i").test(path) && route.headers.some(header => header.key === "Cache-Control" && header.value.includes("no-store"))), path);
  }
});
