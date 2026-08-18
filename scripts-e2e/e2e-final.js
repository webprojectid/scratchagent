const fs = require("fs");
const T = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
const BASE = "http://localhost:3000";
const H = { Authorization: "Bearer " + T };
const ATTACK_IP = "104.16.132.229"; // IP publik Cloudflare (punya geo data nyata).
const VALID = JSON.stringify({ brief: "aplikasi laundry kecil", techPrefs: { mode: "auto" } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // 1. Serangan: 4x generate tanpa token, UA bot nyata + x-forwarded-for IP publik.
  for (let i = 0; i < 4; i++) {
    const r = await fetch(BASE + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ATTACK_IP, "user-agent": "Mozilla/5.0 (compatible; EvilBot/2.1; +http://evil.example/bot)" },
      body: VALID,
    });
    process.stdout.write(`[attack ${i + 1}] HTTP ${r.status}  `);
  }
  console.log("");
  await sleep(1500);

  // 2. Dashboard: cek event auth_failed + UA + geo.
  const j = await (await fetch(BASE + "/api/admin/security?limit=60", { headers: H })).json();
  const atks = j.events.filter((e) => e.type === "auth_failed" && e.ip === ATTACK_IP);
  console.log("auth_failed dari", ATTACK_IP, ":", atks.length);
  if (atks[0]) {
    const e = atks[0];
    console.log("  UA     :", e.ua);
    console.log("  browser:", e.uaBrowser, "| OS:", e.uaOs, "| kind:", e.uaKind);
    console.log("  geo    :", e.ipGeo, "| ipLabel:", e.ipLabel);
  }
  const topIp = j.stats.topIps.find((x) => x.ip === ATTACK_IP);
  console.log("topIps serangan:", topIp ? JSON.stringify(topIp) : "belum masuk top");

  // 3. Block IP itu, verifikasi enforcement 403, lalu unblock.
  const b = await (await fetch(BASE + "/api/admin/security", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ action: "block_ip", ip: ATTACK_IP, reason: "E2E bot EvilBot" }) })).json();
  console.log("block_ip:", JSON.stringify(b));
  const denied = await fetch(BASE + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ATTACK_IP, "user-agent": "EvilBot/2.1" },
    body: VALID,
  });
  console.log("generate saat diblokir -> HTTP", denied.status, JSON.stringify(await denied.json()));
  const ub = await (await fetch(BASE + "/api/admin/security", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ action: "unblock_ip", ip: ATTACK_IP }) })).json();
  console.log("unblock_ip:", JSON.stringify(ub));
  console.log("SELESAI");
})().catch((e) => { console.error("ERR", e); process.exit(1); });
