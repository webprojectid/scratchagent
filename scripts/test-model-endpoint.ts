import { getDb } from '../src/db';
import { users, subscriptions } from '../src/db/schema';
import { eq, and, sql } from 'drizzle-orm';

async function main() {
  console.log("=== 1. SETTING TEGUHENDS MENJADI PRO ===");
  const db = getDb();
  const email = "teguhends@gmail.com";
  
  // Cari user
  let userRows = await db.select().from(users).where(eq(users.email, email));
  let userId: string;
  
  if (userRows.length === 0) {
    console.log(`User ${email} belum ada di DB, membuat user baru...`);
    userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email: email,
      name: "Teguh Ends",
      tier: "pro",
    } as any);
  } else {
    userId = userRows[0].id;
    console.log(`User ditemukan dengan ID: ${userId}, update tier ke 'pro'...`);
    await db.update(users).set({ tier: "pro" } as any).where(eq(users.id, userId));
  }

  // Cek subscription aktif atau buat baru
  const activeSubs = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), sql`${subscriptions.endedAt} is null`));

  const expiresAt = new Date(Date.now() + 93 * 24 * 60 * 60 * 1000); // 3 bulan
  if (activeSubs.length === 0) {
    await db.insert(subscriptions).values({
      userId,
      grantedBy: "system-admin",
      expiresAt,
    } as any);
    console.log(`✓ Langganan Pro 93 hari berhasil dibuat untuk ${email}!`);
  } else {
    console.log(`✓ User ${email} sudah memiliki langganan Pro aktif!`);
  }

  console.log("\n=== 2. MENGECEK KETERSEDIAAN MODEL DI ENDPOINT ===");
  const testModels = ["DeepSeek-V4-Flash", "Kimi-K2.7-Code", "Qwen3.7-Plus"];
  const baseUrl = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  const apiKey = process.env.LLM_API_KEY || "";

  for (const model of testModels) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Halo! Jawab dalam 1 kata 'Siap'." }],
          max_tokens: 10,
        }),
      });
      const t1 = Date.now();
      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Model "${model}": TERSEDIA & RESPONSIF (${t1 - t0}ms) -> "${data.choices?.[0]?.message?.content?.trim()}"`);
      } else {
        const errText = await res.text();
        console.log(`✗ Model "${model}": HTTP ${res.status} -> ${errText.substring(0, 150)}`);
      }
    } catch (e: any) {
      console.log(`✗ Model "${model}": Gagal koneksi -> ${e.message}`);
    }
  }
}

main().catch(console.error);
