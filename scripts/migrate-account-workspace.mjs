import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

try { process.loadEnvFile(".env"); } catch { /* Hosted runs provide environment variables directly. */ }
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured before migration.");
const url = new URL(process.env.DATABASE_URL);
const local = ["localhost", "127.0.0.1"].includes(url.hostname);
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000, ...(local || process.env.DATABASE_SSL === "false" ? {} : { ssl: { rejectUnauthorized: false } }) });
try {
  await client.connect();
  const existing = await client.query("SELECT to_regclass('public.users') AS users, to_regclass('public.plans') AS plans, to_regclass('public.tokens') AS tokens");
  if (Object.values(existing.rows[0]).some(value => !value)) throw new Error("Base schema is missing. Apply the existing project migrations first.");
  await client.query(readFileSync(fileURLToPath(new URL("../drizzle/0010_account_workspace.sql", import.meta.url)), "utf8"));
  const result = await client.query("SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='public' AND tablename IN ('account_settings','account_project_state','account_library','account_activity','account_token_policy','account_sessions') AND rowsecurity=true");
  if (result.rows[0].tables !== 6) throw new Error("Account schema verification failed.");
  console.log("Account workspace migration applied: 6 tables, RLS enabled, existing data preserved.");
} catch (error) {
  console.error("Account migration failed:", error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[database URL]") : "unknown error");
  process.exitCode = 1;
} finally { await client.end(); }
