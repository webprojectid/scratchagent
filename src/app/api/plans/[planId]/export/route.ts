import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import { renderPrdMd } from "@/lib/zip";
import { recordAccountActivity } from "@/lib/account-store";

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;

  // Export PRD adalah fitur Pro (sesuai tabel pricing). Format json tetap
  // terbuka karena dipakai UI internal; hanya md/zip yang digate.
  const format = searchParams.get("format") ?? "json";
  if (!["md", "zip", "json"].includes(format)) return NextResponse.json({ error: apiText("Format ekspor tidak valid.") }, { status: 400 });
  if (format === "md" || format === "zip") {
    const account = user ? await getAccountState(user.userId) : null;
    if ((account?.tier ?? "free") !== "pro") {
      return NextResponse.json({ error: apiText("Export PRD hanya untuk paket Pro.") }, { status: 403 });
    }
  }

  if (format === "md") {
    if (user) await recordAccountActivity(user.userId, "export", "Plan diekspor sebagai Markdown", planId);
    const md = renderPrdMd(plan);
    return new Response(md, { headers: { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename="PRD.md"` } });
  }

  if (format === "zip") {
    if (user) await recordAccountActivity(user.userId, "export", "Plan diekspor sebagai ZIP", planId);
    const { createZip } = await import("@/lib/zip");
    const zip = createZip(plan);
    return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="scratch-agent-${planId}.zip"` } });
  }

  if (user && searchParams.get("download") === "1") await recordAccountActivity(user.userId, "export", "Plan diekspor sebagai JSON", planId);
  return NextResponse.json(plan);
}
