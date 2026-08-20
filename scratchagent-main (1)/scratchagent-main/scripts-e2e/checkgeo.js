const fs = require("fs");
const T = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
(async () => {
  const j = await (await fetch("http://localhost:3000/api/admin/security?limit=100", { headers: { Authorization: "Bearer " + T } })).json();
  const atk = j.events.filter((e) => e.ip === "203.0.113.5" || (e.detail && JSON.stringify(e.detail).includes("EvilBot")));
  console.log("attack events:", atk.length);
  atk.slice(0, 3).forEach((e) =>
    console.log("-", e.type, "| ip:", e.ip, "| geo:", e.ipGeo, "| UA:", e.ua, "| browser:", e.uaBrowser, "| os:", e.uaOs, "| kind:", e.uaKind),
  );
  const evil = j.events.find((e) => e.ua && e.ua.includes("EvilBot"));
  console.log("EvilBot event:", evil ? JSON.stringify({ ua: evil.ua, uaKind: evil.uaKind, browser: evil.uaBrowser, ip: evil.ip, ipLabel: evil.ipLabel, ipGeo: evil.ipGeo }) : "TIDAK ADA");
  const botKind = j.events.filter((e) => e.uaKind === "bot").length;
  console.log("events berlabel kind=bot:", botKind);
  console.log("blockedIps:", JSON.stringify(j.blockedIps));
  console.log("localNote:", j.localNote?.slice(0, 80));
})().catch((e) => console.log("ERR", e.message));
