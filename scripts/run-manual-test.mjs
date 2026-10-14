import { spawnSync } from "node:child_process";
import path from "node:path";

const scripts = new Map([
  ["plan-generation", "tests/e2e-plan-generation.ts"],
  ["full-plan", "tests/full-plan-simulation.ts"],
  ["providers", "tests/simulate-llm-config.ts"],
  ["local-generation", "tests/verify-local-test.ts"],
]);
const [name, confirmation] = process.argv.slice(2);
if (!scripts.has(name) || confirmation !== "--allow-live") {
  console.error("Manual live tests can spend provider credit; plan-generation also writes to a database.");
  console.error(`Usage: npm run test:manual -- <${[...scripts.keys()].join("|")}> --allow-live`);
  process.exit(1);
}
if (process.env.CI || process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Manual live tests are disabled in CI and production environments.");
  process.exit(1);
}
try { process.loadEnvFile(".env"); } catch { /* Explicit shell configuration can be used instead. */ }
if (process.env.CI || process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Manual live tests are disabled in CI and production environments.");
  process.exit(1);
}
const configuredDatabase = process.env.DATABASE_URL;
const testDatabase = process.env.MANUAL_TEST_DATABASE_URL;
if (name === "plan-generation" && (!testDatabase || testDatabase === configuredDatabase)) {
  console.error("Configure a separate MANUAL_TEST_DATABASE_URL for the database-writing test. The application's database is never reused.");
  process.exit(1);
}
if (testDatabase && testDatabase === configuredDatabase) {
  console.error("The manual test database must be separate from the application's database.");
  process.exit(1);
}
delete process.env.DATABASE_URL;
if (testDatabase) process.env.DATABASE_URL = testDatabase;
if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY || !process.env.LLM_MODEL) {
  console.error("Configure the manual test provider locally. Credential values are not printed.");
  process.exit(1);
}
const result = spawnSync(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), "--tsconfig", "tsconfig.json", scripts.get(name)], { stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
