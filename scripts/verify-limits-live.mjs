// Verifikasi live limit Free vs Pro terhadap pipeline nyata.
// Tier terdeteksi otomatis dari respons kuota.
// Alur: kuota awal -> POST /api/generate -> cek struktur (fase/sub-fitur)
// -> generate tasks semua fitur -> cek total task + kuota akhir.
const BASE = "http://localhost:3000";
const TOKEN = process.env.SIM_TOKEN ?? "";
if (!TOKEN) { console.error("SIM_TOKEN wajib"); process.exit(1); }

const LIMITS = {
  free: { features: [4, 8], subFeatures: [3, 5], tasks: [14, 20] },
  pro: { features: [10, 15], subFeatures: [8, 12], tasks: [15, 25] },
};

const auth = { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } };
const j = async (r) => r.json();

const BRIEF = "Aplikasi laundry kiloan satu outlet: pelanggan antar cucian, admin catat order, hitung berat, estimasi selesai, pembayaran, dan laporan harian sederhana.";

async function main() {
  const before = await j(await fetch(`${BASE}/api/generate`, { headers: auth.headers }));
  const tier = before.tier === "pro" ? "pro" : "free";
  const L = LIMITS[tier];
  console.log("[kuota awal]", JSON.stringify(before));
  console.log(`[tier terdeteksi] ${tier} -> limit fase ${L.features}, sub-fitur ${L.subFeatures}, task ${L.tasks}`);

  console.log("[generate] POST /api/generate ...");
  const t0 = Date.now();
  const gen = await fetch(`${BASE}/api/generate`, {
    ...auth,
    method: "POST",
    body: JSON.stringify({ brief: BRIEF, techPrefs: { mode: "auto" } }),
  });
  const genRes = await j(gen);
  console.log(`[generate] ${gen.status} dalam ${((Date.now() - t0) / 1000).toFixed(0)}s`, JSON.stringify(genRes));
  if (!genRes.id) process.exit(1);
  const planId = genRes.id;

  // Struktur: cek jumlah fase + sub-fitur per fase.
  const plan = await j(await fetch(`${BASE}/api/v1/plans/${planId}`, { headers: auth.headers }));
  const featureCount = plan.features.length;
  const subCounts = plan.features.map((f) => ({ title: f.title, subs: (f.subFeatures ?? []).length }));
  console.log(`[struktur] tier plan: ${plan.tier}`);
  console.log(`[struktur] fase: ${featureCount} (limit free: 4-8)`);
  console.log("[struktur] sub-fitur per fase:", JSON.stringify(subCounts));
  console.log(`[struktur] warnings: ${JSON.stringify(plan.warnings ?? [])}`);

  // Generate tasks semua fitur, satu per satu (endpoint yang dipakai UI).
  for (let i = 0; i < featureCount; i++) {
    const r = await fetch(`${BASE}/api/plans/${planId}/generate-tasks`, {
      ...auth, method: "POST", body: JSON.stringify({ featureIndex: i }),
    });
    const res = await j(r);
    console.log(`[tasks] fitur ${i + 1}/${featureCount}: ${JSON.stringify(res)}`);
  }

  // Total task akhir termasuk QA & Integrasi.
  const final = await j(await fetch(`${BASE}/api/v1/plans/${planId}`, { headers: auth.headers }));
  const taskCounts = final.features.map((f) =>
    (f.subFeatures ?? []).reduce((a, sf) => a + (sf.tasks ?? []).length, 0));
  const total = taskCounts.reduce((a, b) => a + b, 0);
  console.log(`[hasil] task per fase: ${JSON.stringify(taskCounts)}`);
  console.log(`[hasil] TOTAL task: ${total} (limit free: 14-20)`);

  const after = await j(await fetch(`${BASE}/api/generate`, { headers: auth.headers }));
  console.log("[kuota akhir]", JSON.stringify(after));

  // Vonis.
  const okFase = featureCount >= L.features[0] && featureCount <= L.features[1];
  const okSub = subCounts.every((s) => s.subs >= 1 && s.subs <= L.subFeatures[1]);
  const okTask = total >= L.tasks[0] && total <= L.tasks[1];
  console.log(`\n=== VONIS ${tier.toUpperCase()} TIER ===`);
  console.log(`fase ${featureCount} dalam ${L.features[0]}-${L.features[1]}: ${okFase ? "PASS" : "FAIL"}`);
  console.log(`sub-fitur <=${L.subFeatures[1]} per fase: ${okSub ? "PASS" : "FAIL"}`);
  console.log(`total task ${total} dalam ${L.tasks[0]}-${L.tasks[1]}: ${okTask ? "PASS" : "FAIL"}`);
  console.log(`planId=${planId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
