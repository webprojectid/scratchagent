import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { pool?: Pool };

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum dikonfigurasi");
  if (!globalDb.pool) {
    const url = new URL(process.env.DATABASE_URL);
    const isLocal = url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1");
    const isPooler = url.port === "6543" || url.hostname.includes("pooler.supabase.com");
    globalDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Serverless (Vercel): tiap instance bikin pool sendiri. Default max=10
      // per instance gampang banjir koneksi di Supabase pooler free tier →
      // gejala 'Failed query' intermittent dari prod. Kecilin + timeout ketat.
      // SSL aktif otomatis untuk host remote; pooler transaction mode
      // gak suka sesi idle lama.
      ...(isLocal || process.env.DATABASE_SSL === "false" ? {} : { ssl: { rejectUnauthorized: false } }),
      max: isPooler ? 5 : 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 15_000,
    });
  }
  return drizzle(globalDb.pool, { schema });
}
