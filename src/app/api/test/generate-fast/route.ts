import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { savePlan } from "@/lib/storage";
import { updatePlanStatus } from "@/lib/storage";
import type { Plan } from "@/lib/types";

function buildTaskRef(fi: number, si: number, ti: number): string {
  return `F${String(fi + 1).padStart(2, "0")}-S${String(si + 1).padStart(2, "0")}-T${String(ti).padStart(2, "0")}`;
}

export async function GET() {
  const planId = randomUUID();
  const features = [
    {
      slug: "autentikasi",
      title: "Autentikasi",
      icon: "shield",
      description: "Login dan register pengguna.",
      tujuan: "Pengguna bisa masuk.",
      selesaiBila: ["Login & register berhasil"],
      priority: "high" as const,
      status: "direncanakan" as const,
      subFeatures: [
        { title: "Login", tujuan: "Login pengguna", selesaiBila: ["Form login jalan"] },
        { title: "Register", tujuan: "Register pengguna", selesaiBila: ["Form register jalan"] },
      ],
    },
    {
      slug: "dashboard",
      title: "Dashboard",
      icon: "layout",
      description: "Halaman utama pengguna.",
      tujuan: "Pengguna lihat ringkasan.",
      selesaiBila: ["Dashboard tampil"],
      priority: "medium" as const,
      status: "direncanakan" as const,
      subFeatures: [
        { title: "Ringkasan", tujuan: "Statistik ringkasan", selesaiBila: ["Statistik muncul"] },
      ],
    },
  ];

  const plan: Plan = {
    id: planId,
    title: "Simulasi Generate Cepat",
    brief: "Demo generate cepat tanpa LLM.",
    stack: ["Next.js", "Tailwind CSS"],
    asumsi: ["Demo only"],
    requirements: { fungsional: [], nonFungsional: [] },
    userFlow: [],
    architecture: "flowchart TD\n  A[Browser] --> B[App]\n",
    databaseSchema: "erDiagram\n  USERS { uuid id }\n",
    status: "generating",
    createdAt: new Date().toISOString(),
    features: features.map((f) => ({
      ...f,
      subFeatures: f.subFeatures.map((sf) => ({ ...sf, tasks: [] })),
    })),
  };

  await savePlan(plan, "shared");

  // Generate fake tasks immediately
  let taskNum = 0;
  for (let fi = 0; fi < plan.features.length; fi++) {
    const feature = plan.features[fi];
    for (let si = 0; si < feature.subFeatures.length; si++) {
      const sub = feature.subFeatures[si];
      sub.tasks = [
        { ref: buildTaskRef(fi, si, ++taskNum), title: `UI ${sub.title}`, layer: "frontend" as const, phase: fi + 1, page: null, deps: [], status: "pending" as const, retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
        { ref: buildTaskRef(fi, si, ++taskNum), title: `API ${sub.title}`, layer: "backend" as const, phase: fi + 1, page: null, deps: [], status: "pending" as const, retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
        { ref: buildTaskRef(fi, si, ++taskNum), title: `Test ${sub.title}`, layer: "qa" as const, phase: fi + 1, page: null, deps: [], status: "pending" as const, retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
      ];
    }
  }

  // Add QA tasks to last feature
  const lastFeature = plan.features.at(-1);
  if (lastFeature) {
    lastFeature.subFeatures.push({
      title: "QA & Integrasi",
      tasks: [
        { ref: `F${String(plan.features.length).padStart(2, "0")}-S99-T01`, title: "Jalankan aplikasi end-to-end", layer: "qa", phase: plan.features.length + 1, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
        { ref: `F${String(plan.features.length).padStart(2, "0")}-S99-T02`, title: "Uji alur utama", layer: "qa", phase: plan.features.length + 1, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
      ],
    } as any);
  }

  plan.status = "ready";
  await savePlan(plan, "shared");

  return NextResponse.json({ id: planId });
}
