import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import { removeFeature, removeSubFeature, removeTask } from "@/lib/storage";
import { RATE_LIMITS, clientKey, getClientIp, logSecurity, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * Hapus struktur plan (fitur Pro):
 *   DELETE /api/plans/{id}/structure?type=feature&slug=<featureSlug>
 *   DELETE /api/plans/{id}/structure?type=subfeature&slug=<featureSlug>&title=<judul>
 *   DELETE /api/plans/{id}/structure?type=task&ref=<refTask>
 * Free mendapat 403 dengan pesan upgrade. Task yang sedang berjalan
 * (in_progress) tidak boleh dihapus supaya tidak bentrok dengan agent CLI.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const type = searchParams.get("type");
  const ip = await getClientIp(request);

  const user = await getRequestUser();

  // Rem laju: hapus struktur tidak boleh di-spam.
  const rl = RATE_LIMITS.structure;
  const retryIn = rateLimit(clientKey(user?.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user?.userId, ip), retryIn, { ip, userId: user?.userId ?? null, route: "/api/plans/[id]/structure" });

  const account = user ? await getAccountState(user.userId) : undefined;
  if ((account?.tier ?? "free") !== "pro") {
    await logSecurity("access_denied", { route: "/api/plans/[id]/structure", reason: "free tier" }, { ip, userId: user?.userId ?? null });
    return NextResponse.json(
      { error: "Menghapus struktur plan hanya untuk paket Pro.", upgrade: "/pricing" },
      { status: 403 },
    );
  }

  // write: true juga menolak plan demo (read-only).
  const { plan, error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  if (type === "feature") {
    const slug = searchParams.get("slug") ?? "";
    if (!slug) return NextResponse.json({ error: "Parameter slug wajib diisi." }, { status: 400 });
    const feature = plan!.features.find((f) => f.slug === slug);
    if (!feature) return NextResponse.json({ error: "Fase tidak ditemukan." }, { status: 404 });
    const busy = feature.subFeatures.some((sf) => sf.tasks.some((t) => t.status === "in_progress"));
    if (busy) return NextResponse.json({ error: "Fase ini sedang dikerjakan agent. Tunggu selesai atau gagalkan task-nya dulu." }, { status: 409 });
    const removed = await removeFeature(planId, slug);
    if (removed) await logSecurity("structure_deleted", { planId, kind: "feature", slug }, { ip, userId: user!.userId });
    return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Fase tidak ditemukan." }, { status: 404 });
  }

  if (type === "subfeature") {
    const slug = searchParams.get("slug") ?? "";
    const title = searchParams.get("title") ?? "";
    if (!slug || !title) return NextResponse.json({ error: "Parameter slug dan title wajib diisi." }, { status: 400 });
    const sf = plan!.features.find((f) => f.slug === slug)?.subFeatures.find((s) => s.title === title);
    if (!sf) return NextResponse.json({ error: "Sub-fitur tidak ditemukan." }, { status: 404 });
    if (sf.tasks.some((t) => t.status === "in_progress")) {
      return NextResponse.json({ error: "Sub-fitur ini sedang dikerjakan agent. Tunggu selesai atau gagalkan task-nya dulu." }, { status: 409 });
    }
    const removed = await removeSubFeature(planId, slug, title);
    if (removed) await logSecurity("structure_deleted", { planId, kind: "subfeature", slug, title }, { ip, userId: user!.userId });
    return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Sub-fitur tidak ditemukan." }, { status: 404 });
  }

  if (type === "task") {
    const ref = searchParams.get("ref") ?? "";
    if (!ref) return NextResponse.json({ error: "Parameter ref wajib diisi." }, { status: 400 });
    const task = plan!.features.flatMap((f) => f.subFeatures.flatMap((s) => s.tasks)).find((t) => t.ref === ref);
    if (!task) return NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
    if (task.status === "in_progress") {
      return NextResponse.json({ error: "Task sedang dikerjakan agent. Gagal atau selesaikan dulu sebelum menghapus." }, { status: 409 });
    }
    const removed = await removeTask(planId, ref);
    if (removed) await logSecurity("structure_deleted", { planId, kind: "task", ref }, { ip, userId: user!.userId });
    return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ error: "Parameter type harus feature, subfeature, atau task." }, { status: 400 });
}
