// Jalankan migration drizzle langsung lewat drizzle-orm/migrator,
// supaya error asli terlihat (drizzle-kit CLI menelan error di spinner).
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum diset. Jalankan: export $(grep -v '^#' .env | grep -v '^$' | xargs)");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  console.log("Mulai migrate ke folder ./drizzle ...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migration selesai.");
  const rows = await pool.query("SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at");
  console.log("Total migration applied:", rows.rows.length);
} catch (e) {
  console.error("MIGRATE ERROR:", e?.message ?? e);
  process.exit(1);
} finally {
  await pool.end();
}
