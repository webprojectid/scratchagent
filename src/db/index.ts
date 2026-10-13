import { readFileSync } from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as accountSchema from "./account-schema";

const fullSchema = { ...schema, ...accountSchema };
type Database = NodePgDatabase<typeof fullSchema>;
const transactionScope = new AsyncLocalStorage<Database>();
const globalDb = globalThis as unknown as { pool?: Pool };
export async function withDatabaseTransaction<T>(operation: () => Promise<T>): Promise<T> {
  if (transactionScope.getStore()) return operation();
  return getDb().transaction(tx => transactionScope.run(tx as unknown as Database, operation));
}
export function getDb(): Database {
  const transaction = transactionScope.getStore();
  if (transaction) return transaction;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalDb.pool) {
    const url = new URL(process.env.DATABASE_URL);
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const isSupabase = url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".pooler.supabase.com");
    const isPooler = url.port === "6543" || url.hostname.endsWith(".pooler.supabase.com");
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
    const ca = process.env.DATABASE_SSL_CA?.replaceAll("\\n", "\n") || (isSupabase ? readFileSync(path.join(process.cwd(), "src/db/certificates/supabase-ca.crt"), "utf8") : undefined);
    globalDb.pool = new Pool({
      connectionString: url.toString(),
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) } }),
      max: isPooler ? 5 : 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 15_000,
    });
  }
  return drizzle(globalDb.pool, { schema: fullSchema });
}
