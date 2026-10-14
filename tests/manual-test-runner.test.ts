import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

test("manual live runner rejects missing consent before loading provider configuration", () => {
  const result = spawnSync(process.execPath, [path.resolve("scripts/run-manual-test.mjs"), "providers"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("--allow-live"));
});

test("manual live runner rejects CI even when live execution is selected", () => {
  const result = spawnSync(process.execPath, [path.resolve("scripts/run-manual-test.mjs"), "providers", "--allow-live"], { encoding: "utf8", env: { ...process.env, CI: "true" } });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("disabled in CI"));
});

test("database-writing manual test cannot fall back to the application database", () => {
  const environment = { ...process.env };
  delete environment.CI;
  delete environment.NODE_ENV;
  delete environment.VERCEL_ENV;
  delete environment.MANUAL_TEST_DATABASE_URL;
  const result = spawnSync(process.execPath, [path.resolve("scripts/run-manual-test.mjs"), "plan-generation", "--allow-live"], { encoding: "utf8", env: environment });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("separate MANUAL_TEST_DATABASE_URL"));
});
