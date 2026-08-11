import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { savePlan } from "@/lib/storage";
import type { Plan } from "@/lib/types";

export async function GET() {
  const planId = randomUUID();
  const plan: Plan = {
    id: planId,
    title: "Simulasi Produk Demo",
    brief: "Aplikasi demo untuk memverifikasi UI plan dashboard tanpa menunggu LLM.",
    stack: ["Next.js", "Tailwind CSS", "PostgreSQL"],
    asumsi: ["Demo hanya untuk verifikasi UI", "Tidak perlu autentikasi"],
    requirements: { fungsional: ["Login pengguna", "Dashboard plan"], nonFungsional: ["Responsive", "Cepat"] },
    userFlow: [{ title: "Membuat plan", steps: ["Isi brief", "Tunggu generate", "Lihat plan"] }],
    architecture: "flowchart TD\n    A[Browser] -->|HTTP| B[Next.js App]\n    B --> C[API Routes]\n    C --> D[Database]\n",
    databaseSchema: "erDiagram\n    USERS {\n        uuid id\n        string email\n    }\n    PLANS {\n        uuid id\n        string title\n    }\n    USERS ||--o{ PLANS : creates\n",
    status: "ready",
    createdAt: new Date().toISOString(),
    features: [
      {
        slug: "autentikasi",
        title: "Autentikasi",
        icon: "shield",
        description: "Login dan register pengguna.",
        tujuan: "Pengguna bisa masuk ke aplikasi.",
        selesaiBila: ["Login berhasil", "Register berhasil"],
        priority: "high",
        status: "direncanakan",
        subFeatures: [
          {
            title: "Login",
            tujuan: "Pengguna login dengan email.",
            selesaiBila: ["Form login tersedia"],
            tasks: [
              { ref: "F01-S01-T01", title: "Buat UI form login", layer: "frontend", phase: 1, page: "/login", deps: [], status: "pending" },
              { ref: "F01-S01-T02", title: "Integrasi API login", layer: "backend", phase: 1, page: null, deps: ["F01-S01-T01"], status: "pending" },
            ],
          },
          {
            title: "Register",
            tujuan: "Pengguna daftar akun baru.",
            selesaiBila: ["Form register tersedia"],
            tasks: [
              { ref: "F01-S02-T01", title: "Buat UI form register", layer: "frontend", phase: 1, page: "/register", deps: [], status: "pending" },
              { ref: "F01-S02-T02", title: "API register", layer: "backend", phase: 1, page: null, deps: ["F01-S02-T01"], status: "pending" },
            ],
          },
        ],
      },
      {
        slug: "dashboard",
        title: "Dashboard",
        icon: "layout",
        description: "Halaman utama setelah login.",
        tujuan: "Pengguna melihat ringkasan plan.",
        selesaiBila: ["Dashboard tampil data"],
        priority: "medium",
        status: "direncanakan",
        subFeatures: [
          {
            title: "Ringkasan",
            tujuan: "Tampilkan statistik singkat.",
            selesaiBila: ["Statistik muncul"],
            tasks: [
              { ref: "F02-S01-T01", title: "Buat komponen statistik", layer: "frontend", phase: 2, page: "/dashboard", deps: [], status: "pending" },
              { ref: "F02-S01-T02", title: "Fetch data dashboard", layer: "backend", phase: 2, page: null, deps: ["F02-S01-T01"], status: "pending" },
            ],
          },
        ],
      },
    ],
  };

  await savePlan(plan, "shared");
  return NextResponse.json({ id: planId });
}
