import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function authFixture(production = false) {
  const fixture = { exports: {} as { getRequestUser: (identity: string) => Promise<{ userId: string; email: string | null; via: string } | null> } };
  const output = ts.transpileModule(readFileSync("src/lib/api-auth.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(output, {
    module: fixture, exports: fixture.exports,
    process: { env: { NODE_ENV: production ? "production" : "development" } },
    require: (name: string) => name === "next/headers" ? { headers: async () => new Headers() }
      : name === "@/lib/memory-store" ? { memoryGetOrCreateUser: (email: string) => ({ id: "canonical-local-user", email }) }
      : {},
  });
  return fixture.exports;
}

test("local email identity resolves to the canonical account ID used by Pro subscriptions", async () => {
  const auth = authFixture();
  const user = await auth.getRequestUser("pro@example.test");
  assert.ok(user);
  assert.equal(user.userId, "canonical-local-user");
  assert.equal(user.email, "pro@example.test");
  assert.equal(user.via, "legacy-dev");
  assert.equal((await auth.getRequestUser("shared"))?.userId, "shared");
});

test("production continues to reject client-supplied legacy identities", async () => {
  assert.equal(await authFixture(true).getRequestUser("pro@example.test"), null);
});
