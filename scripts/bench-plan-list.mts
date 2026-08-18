// Benchmark jalur list plan: lama (hydrate penuh per plan) vs baru (3 query ringkas).
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const { listPlans, listPlanSummaries } = await import("../src/lib/storage.js");
const { getDb } = await import("../src/db/index.js");
const { users } = await import("../src/db/schema.js");
const { eq } = await import("drizzle-orm");

const db = getDb();
const rows = await db.select({ id: users.id, email: users.email }).from(users).limit(1);
const dbUserId = rows[0]?.id;
const ownerKey = rows[0]?.email ?? dbUserId;

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const r = await fn();
  console.log(`${label}: ${Date.now() - t0}ms`);
  return r;
}

// Warm up connection pool sekali.
await listPlanSummaries(ownerKey);

const oldRes = await timed("JALUR LAMA (hydrate penuh)", () => listPlans(ownerKey));
const newRes = await timed("JALUR BARU (ringkas 3 query)", () => listPlanSummaries(ownerKey));

console.log(`jumlah plan user ${rows[0]?.email}: ${oldRes.length}`);
console.log("sample lama :", JSON.stringify(oldRes.map((p: any) => ({ id: p.id, title: p.title, status: p.status, tasks: undefined }))));
console.log("sample baru :", JSON.stringify(newRes.map((p: any) => ({ id: p.id, title: p.title, status: p.status, taskCount: p.taskCount, tasksDone: p.tasksDone }))));

process.exit(0);
