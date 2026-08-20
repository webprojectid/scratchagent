// Bangun file demo baru dari plan FutsalGo (e146017e-...):
// reset status jadi fresh (plan ready, semua task pending),
// tambahkan diagram arsitektur mermaid yang cocok dengan narasinya,
// lalu tulis ke src/lib/demo-futsalgo.json.
import { readFileSync, writeFileSync } from "node:fs";

const ARCH_DIAGRAM = `

\`\`\`mermaid
flowchart TB
  M["Mobile App<br/>React Native"] --> ELB["AWS ELB<br/>Load Balancer"]
  A["Web Admin<br/>Next.js SSR"] --> ELB
  M <-.->|"Socket.io<br/>update slot realtime"| BE

  ELB --> BE

  subgraph BE["Backend Monolitik Modular (Node.js)"]
    AUTH["Modul Auth<br/>JWT + Refresh Token"]
    BOOK["Modul Booking<br/>Slot, Reschedule, Batal"]
    PAY["Modul Payment<br/>DP + Webhook"]
    NOTIF["Modul Notifikasi<br/>FCM, Email, node-cron"]
  end

  AUTH --> REDIS[("Redis Cluster<br/>Cache, Session, Blacklist, Pub/Sub")]
  BOOK --> PG[("PostgreSQL<br/>Master + Read Replica")]
  BOOK --> REDIS
  PAY <-->|"webhook"| MID["Payment Gateway<br/>Midtrans / Xendit"]
  NOTIF -->|"pengingat H-1"| BOOK
  NOTIF --> FCM["Firebase Cloud Messaging"]
  NOTIF --> SG["SendGrid Email"]
  BE -.-> MON["Monitoring<br/>Prometheus + Grafana"]
\`\`\`
`;

const src = JSON.parse(readFileSync("/tmp/plan-full.json", "utf8"));

const features = src.features.map((f, fi) => ({
  slug: f.slug,
  title: f.title,
  icon: f.icon,
  description: f.description,
  tujuan: f.tujuan,
  selesaiBila: f.selesaiBila,
  status: fi === 0 ? "berjalan" : "direncanakan",
  subFeatures: f.subFeatures.map((s) => ({
    title: s.title,
    tasks: s.tasks.map((t) => ({
      ref: t.ref,
      title: t.title,
      layer: t.layer,
      phase: t.phase,
      page: t.page,
      deps: t.deps,
      status: "pending",
      retryCount: 0,
      lastFailReason: null,
      failReason: null,
      startedAt: null,
      completedAt: null,
    })),
  })),
}));

const plan = {
  id: "demo",
  title: src.title,
  brief: src.brief,
  stack: src.stack,
  techStack: [],
  asumsi: src.asumsi,
  architecture: src.architecture.trimEnd() + ARCH_DIAGRAM,
  databaseSchema: src.databaseSchema,
  status: "ready",
  features,
};

writeFileSync("src/lib/demo-futsalgo.json", JSON.stringify(plan, null, 2), "utf8");

const total = features.flatMap((f) => f.subFeatures).reduce((a, s) => a + s.tasks.length, 0);
console.log("OK src/lib/demo-futsalgo.json");
console.log("features:", features.length, "| tasks:", total);
console.log("arch length:", plan.architecture.length, "| dbschema length:", plan.databaseSchema.length);
console.log("phase 1 sub:", features[0].subFeatures.map((s) => s.title).join(" | "));
