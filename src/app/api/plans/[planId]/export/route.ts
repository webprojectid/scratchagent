import { NextResponse } from "next/server";
import { getPlan } from "@/lib/storage";
import { renderPrdMd } from "@/lib/zip";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

  const { searchParams } = new URL(_request.url);
  const format = searchParams.get("format") ?? "json";

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
