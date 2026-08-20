const fs = require("fs");
const t = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
console.log("token from file, len:", t.length, "starts:", t.slice(0, 8));
(async () => {
  const r = await fetch("http://localhost:3000/api/admin/security?limit=1", {
    headers: { Authorization: "Bearer " + t },
  });
  console.log("status:", r.status);
  const j = await r.json();
  if (j.events) {
    console.log("OK: events:", j.events.length, "| stats24h:", j.stats?.window24h?.total, "| blockedIps:", j.blockedIps?.length);
  } else {
    console.log("body:", JSON.stringify(j));
  }
})().catch((e) => console.log("ERR", e.message));
