import { sql } from "drizzle-orm";
import { getDb, withDatabaseTransaction } from "@/db";

const memoryLocks = new Map<string, Promise<unknown>>();
export async function withPlanMutation<T>(planId: string, operation: () => Promise<T>): Promise<T> {
  if (process.env.DATABASE_URL) return withDatabaseTransaction(async () => {
    await getDb().execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`plan:${planId}`}, 0))`);
    return operation();
  });
  const previous = memoryLocks.get(planId) ?? Promise.resolve();
  const work = previous.catch(() => {}).then(operation);
  memoryLocks.set(planId, work);
  try { return await work; } finally { if (memoryLocks.get(planId) === work) memoryLocks.delete(planId); }
}
