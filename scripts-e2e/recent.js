const fs = require("fs");
const T = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
(async () => {
  const j = await (await fetch("http://localhost:3000/api/admin/security?limit=200", { headers: { Authorization: "Bearer " + T } })).json();
  const recent = j.events.filter((e) => new Date(e.createdAt) > new Date(Date.now() - 15 * 60 * 1000));
  console.log("events 15 menit terakhir:", recent.length);
  recent.forEach((e) =>
    console.log(
      "-",
      e.createdAt.slice(11, 19),
      e.type.padEnd(16),
      "| ip:", (e.ip || "-").padEnd(14),
      "| ua:", (e.ua || "NULL").slice(0, 30),
      "| route:", e.detail?.route || "-",
    ),
  );
})().catch((e) => console.log("ERR", e.message));
