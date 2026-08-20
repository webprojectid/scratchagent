import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { pool?: Pool };

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum dikonfigurasi");
  const pool = globalDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
  if (process.env.NODE_ENV !== "production") globalDb.pool = pool;
  return drizzle(pool, { schema });
}