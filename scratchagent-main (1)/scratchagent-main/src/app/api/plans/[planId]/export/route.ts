import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import { renderPrdMd } from "@/lib/zip";

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;

  // Export PRD adalah fitur Pro (sesuai tabel pricing). Format json tetap
  // terbuka karena dipakai UI internal; hanya md/zip yang digate.
  const format = searchParams.get("format") ?? "json";
  if (format === "md" || format === "zip") {
    const account = user ? await getAccountState(user.userId) : null;
    if ((account?.tier ?? "free") !== "pro") {
      return NextResponse.json({ error: "Export PRD hanya untuk paket Pro." }, { status: 403 });
    }
  }

  if (format === "md") {
    const md = renderPrdMd(plan);
    return new Response(md, { headers: { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename="PRD.md"` } });
  }

  if (format === "zip") {
    const { createZip } = await import("@/lib/zip");
    const zip = createZip(plan);
    return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="scratch-agent-${planId}.zip"` } });
  }

  return NextResponse.json(plan);
}
