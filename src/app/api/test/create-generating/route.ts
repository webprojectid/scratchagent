import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { savePlan } from "@/lib/storage";
import type { Plan } from "@/lib/types";

export async function GET() {
  const planId = randomUUID();
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
    features: [
      {
        slug: "autentikasi",
        title: "Autentikasi",
        icon: "shield",
        description: "Login dan register.",
        tujuan: "Pengguna bisa masuk.",
        selesaiBila: ["Login & register berhasil"],
        priority: "high",
        status: "direncanakan",
        subFeatures: [
          { title: "Login", tujuan: "Login", selesaiBila: ["Jalan"], tasks: [] },
          { title: "Register", tujuan: "Register", selesaiBila: ["Jalan"], tasks: [] },
        ],
      },
      {
        slug: "dashboard",
        title: "Dashboard",
        icon: "layout",
        description: "Halaman utama.",
        tujuan: "Lihat ringkasan.",
        selesaiBila: ["Dashboard tampil"],
        priority: "medium",
        status: "direncanakan",
        subFeatures: [
          { title: "Ringkasan", tujuan: "Statistik", selesaiBila: ["Muncul"], tasks: [] },
        ],
      },
    ],
  };

  await savePlan(plan, "shared");
  return NextResponse.json({ id: planId });
}
