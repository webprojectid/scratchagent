const { Pool } = require("pg");
const crypto = require("crypto");
const pool = new Pool({ connectionString: "postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd!!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres" });

(async () => {
  let r = await pool.query("SELECT id FROM users WHERE email = 'tester@scratchagent.local'");
  let userId;
  if (r.rows.length > 0) {
    userId = r.rows[0].id;
    console.log("User exists:", userId);
  } else {
    userId = crypto.randomUUID();
    await pool.query("INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [userId, "tester@scratchagent.local", "Tester"]);
    console.log("Created user:", userId);
  }
  console.log("DATABASE_USER_ID=" + userId);
  await pool.end();
})().catch(e => { console.error(e); pool.end(); });
