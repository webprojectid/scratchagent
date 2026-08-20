/**
 * E2E Pusat Keamanan: deteksi + respons.
 * Token dibaca dari file (tidak pernah muncul literal di command).
 */
const fs = require("fs");
const T = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
const BASE = "http://localhost:3000";
const H = { Authorization: "Bearer " + T };
const TEST_IP = "203.0.113.5"; // TEST-NET-3, IP dokumentasi publik, aman dipakai uji.

const out = [];
const log = (s) => { out.push(s); console.log(s); };

(async () => {
  // ===== 1. Simulasi serangan: 5x generate tanpa token (dengan x-forwarded-for) =====
  for (let i = 0; i < 5; i++) {
    await fetch(BASE + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": TEST_IP, "user-agent": "EvilBot/1.0 (scanner)" },
      body: JSON.stringify({ brief: "spam attack test" }),
    });
  }
  log("1. serangan 5x tanpa token (x-forwarded-for=" + TEST_IP + ", UA EvilBot) dikirim");

  // ===== 2. Dashboard baca: cari event serangan + cek UA/geo/localNote =====
  const dash = await (await fetch(BASE + "/api/admin/security?limit=50", { headers: H })).json();
  const atk = dash.events.find((e) => e.type === "auth_failed" && e.detail?.route?.includes?.("/api/generate") || (e.type === "auth_failed" && JSON.stringify(e.detail).includes("generate")));
  log("2. dashboard: total24h=" + dash.stats?.window24h?.total + ", events=" + dash.events.length);
  log("   localNote ada: " + !!dash.localNote);
  const withUa = dash.events.find((e) => e.ua);
  log("   event dengan UA: " + (withUa ? withUa.ua.slice(0, 40) + " | browser=" + withUa.uaBrowser + " | kind=" + withUa.uaKind : "TIDAK ADA"));
  const localEv = dash.events.find((e) => e.ipIsLocal);
  log("   label localhost: " + (localEv ? localEv.ipLabel : "TIDAK ADA"));

  // ===== 3. ACTION block_ip =====
  const block = await (await fetch(BASE + "/api/admin/security", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "block_ip", ip: TEST_IP, reason: "E2E: spam generate", durationHours: 1 }),
  })).json();
  log("3. block_ip -> " + JSON.stringify(block));

  // ===== 4. Verifikasi enforcement: request dari IP terblokir harus ditolak =====
  const blocked = await fetch(BASE + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": TEST_IP },
    body: JSON.stringify({ brief: "harus ditolak" }),
  });
  const blockedBody = await blocked.json();
  log("4. generate dari IP diblokir -> HTTP " + blocked.status + " | " + JSON.stringify(blockedBody).slice(0, 100));

  // ===== 5. ACTION unblock_ip =====
  const unblock = await (await fetch(BASE + "/api/admin/security", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unblock_ip", ip: TEST_IP }),
  })).json();
  log("5. unblock_ip -> " + JSON.stringify(unblock));
  const afterUnblock = await fetch(BASE + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": TEST_IP },
    body: JSON.stringify({ brief: "sudah tidak diblokir" }),
  });
  log("   generate setelah unblock -> HTTP " + afterUnblock.status + " (401=auth gagal normal, BUKAN banned)");

  // ===== 6. ACTION reset_user =====
  // pakai user admin sendiri (punya token e2e) — verifikasi token e2e ikut tercabut,
  // lalu buat token baru supaya step berikutnya tetap jalan.
  const me = await (await fetch(BASE + "/api/me", { headers: H })).json();
  const reset = await (await fetch(BASE + "/api/admin/security", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset_user", userId: me.userId }),
  })).json();
  log("6. reset_user -> " + JSON.stringify(reset) + " (revokedTokens termasuk token e2e ini)");
  const meAfter = await (await fetch(BASE + "/api/me", { headers: H })).json();
  log("   /api/me setelah reset dengan token lama -> " + (meAfter.error ? "401 tercabut OK: " + meAfter.error : JSON.stringify(meAfter)));

  // buat token baru untuk lanjut (lewat DB langsung, tanpa command literal)
  const fs2 = require("fs");
  fs2.readFileSync(".env", "utf8").split(/\r?\n/).forEach((l) => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
  const crypto = require("crypto");
  const { Client } = require("pg");
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const t2 = "rv_" + crypto.randomBytes(24).toString("hex");
  await c.query("INSERT INTO tokens (user_id, token_hash, label) VALUES ($1,$2,$3)", [me.userId, crypto.createHash("sha256").update(t2).digest("hex"), "e2e-token-2"]);
  await c.end();
  const H2 = { Authorization: "Bearer " + t2 };
  const meOk = await (await fetch(BASE + "/api/me", { headers: H2 })).json();
  log("   token baru setelah reset -> HTTP OK: " + meOk.email);

  // ===== 7. ACTION dismiss_event (false positive) =====
  const dash2 = await (await fetch(BASE + "/api/admin/security?limit=50", { headers: H2 })).json();
  const target = dash2.events.find((e) => !e.dismissed && e.type !== "event_dismissed" && e.type !== "user_reset");
  const dismiss = await (await fetch(BASE + "/api/admin/security", {
    method: "POST", headers: { ...H2, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "dismiss_event", eventId: target.id }),
  })).json();
  const dash3 = await (await fetch(BASE + "/api/admin/security?limit=50", { headers: H2 })).json();
  const marked = dash3.events.find((e) => e.id === target.id);
  log("7. dismiss_event -> " + JSON.stringify(dismiss) + " | event kini dismissed=" + marked.dismissed);

  // ===== 8. Audit trail: semua aksi tercatat =====
  const audit = dash3.events.filter((e) => ["ip_blocked", "ip_unblocked", "user_reset", "event_dismissed"].includes(e.type));
  log("8. audit trail aksi admin tercatat: " + audit.map((e) => e.type).join(", "));

  log("\nSELESAI");
})().catch((e) => { console.error("ERR", e); process.exit(1); });
