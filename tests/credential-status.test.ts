import { test } from "node:test";
import assert from "node:assert/strict";
import { credentialStatus } from "@/lib/credential-status";
import { requireAdmin, type AuthUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("credential diagnostics distinguish missing, placeholder and repeated auth values", () => {
  const key = ["AUTH", "SECRET"].join("_");
  for (const value of [undefined, "short", "change-" + "this-value-before-using-production-credentials", "x".repeat(64)]) {
    assert.equal(credentialStatus({ [key]: value }).authSecret.meetsBasicChecks, false);
  }
});

test("credential status route remains owner-session-only and returns no secrets or database rows", async (context) => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "diagnostic-admin@example.test";
  context.after(() => { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; });
  const identities: Array<[AuthUser | null, number]> = [
    [null, 401],
    [{ userId: "fixture", email: "diagnostic-admin@example.test", via: "token" }, 403],
    [{ userId: "fixture", email: "free@example.test", via: "session" }, 403],
    [{ userId: "fixture", email: "pro@example.test", via: "session" }, 403],
    [{ userId: "fixture", email: "diagnostic-admin@example.test", via: "session" }, 200],
  ];
  const secretKey = ["AUTH", "SECRET"].join("_");
  const source = readFileSync("src/app/api/admin/security/route.ts", "utf8");
  for (const [identity, status] of identities) {
    const mockDependencies: Record<string, unknown> = {
      "next/server": { NextResponse },
      "drizzle-orm": {},
      "@/lib/write-origin": {},
      "@/lib/ui-messages": {},
      "@/lib/api-auth": { getRequestUser: async () => identity, requireAdmin },
      "@/lib/credential-status": { credentialStatus },
      "@/db": { getDb: () => { throw new Error("Credential diagnostics must not query tables"); } },
      "@/db/schema": {},
      "@/lib/security": { RATE_LIMITS: { admin: { limit: 20, windowMs: 1000 } }, getClientIp: async () => null, logSecurity: async () => {}, clientKey: () => "fixture", rateLimit: () => null },
    };
    const fixtureModule = { exports: {} as { GET: (request: Request) => Promise<Response> } };
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(compiled, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => {
      if (!(name in mockDependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return mockDependencies[name];
    }, URL, process: { env: { [secretKey]: "synthetic-secret-value-not-to-be-returned", DATABASE_URL: "fixture" } } });
    const response = await fixtureModule.exports.GET(new Request("https://example.test/api/admin/security?view=credential-status"));
    assert.equal(response.status, status);
    const body = await response.text();
    assert.ok(!body.includes("synthetic-secret-value-not-to-be-returned"));
    if (status === 200) assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("credential diagnostics return booleans without values and cannot verify DB rotation", () => {
  const secret = "SyntheticOnly-" + "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
  const authKey = ["AUTH", "SECRET"].join("_");
  const providerKey = ["LLM", "API", "KEY"].join("_");
  const result = credentialStatus({ [authKey]: secret, [providerKey]: "synthetic-provider-value", DATABASE_URL: "synthetic-database-value" });
  assert.equal(result.authSecret.meetsBasicChecks, true);
  assert.equal(result.database.rotationVerified, false);
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(!JSON.stringify(result).includes("synthetic-provider-value"));
  assert.ok(!JSON.stringify(result).includes("synthetic-database-value"));
});
