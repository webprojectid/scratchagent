import { writeOriginGate } from "@/lib/write-origin";
import { apiText } from "@/lib/ui-messages";
import { NextResponse, after } from "next/server";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { banUser, endPro, getAccountDetail, grantPro, isAdminEmail, unbanUser } from "@/lib/billing";
import { getClientIp, logSecurity, clientKey, rateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

/** Detail lengkap satu akun: tier, riwayat Pro, catatan pemakaian. */
export async function GET(_request: Request, { params }: Params) {
  const user = await getRequestUser();
  const gate = await requireAdmin(user);
  if (gate) return gate;
  try {
    const auditIp = await getClientIp();
    const key = clientKey(user?.userId, auditIp);
    const limit = RATE_LIMITS.admin;
    const retry = rateLimit(key, limit.limit, limit.windowMs);
    if (retry !== null) return rateLimitedResponse(key, retry, { ip: auditIp, userId: user?.userId ?? null, route: "/api/admin/users/[id]" });
    const { id } = await params;
    const detail = await getAccountDetail(id);
    if (!detail) return NextResponse.json({ error: apiText("Akun tidak ditemukan") }, { status: 404 });
    return NextResponse.json({ account: detail });
  } catch (e: unknown) {
    console.error("[admin]", e);
    return NextResponse.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
  }
}

/**
 * Aksi admin terhadap satu akun. Body: { action, days? }.
 * - grant-pro: aktifkan akses Pro, wajib kirim days (7/14/28/31/93)
 * - end-pro: akhiri Pro, kembali ke Free
 * - ban: banned permanen
 * - unban: cabut banned
 */
export async function POST(request: Request, { params }: Params) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  const user = await getRequestUser();
  const gate = await requireAdmin(user);
  if (gate) {
    const ip = await getClientIp(request);
    await logSecurity("access_denied", { route: "/api/admin/users/[id]", method: "POST", reason: "not admin" }, { ip, userId: user?.userId ?? null });
    return gate;
  }
  try {
    const auditIp = await getClientIp(request);
    const key = clientKey(user?.userId, auditIp);
    const limit = RATE_LIMITS.admin;
    const retry = rateLimit(key, limit.limit, limit.windowMs);
    if (retry !== null) return rateLimitedResponse(key, retry, { ip: auditIp, userId: user?.userId ?? null, route: "/api/admin/users/[id]" });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // Admin tidak boleh mem-banned dirinya sendiri, dan tidak boleh
    // mengubah langganan sesama admin.
    const target = await getAccountDetail(id);
    if (!target) return NextResponse.json({ error: apiText("Akun tidak ditemukan") }, { status: 404 });
    if (isAdminEmail(target.email)) {
      return NextResponse.json({ error: apiText("Akun admin tidak bisa diubah lewat menu ini.") }, { status: 400 });
    }

    if (action === "grant-pro" && !Number.isFinite(Number(body?.days))) {
      return NextResponse.json({ error: apiText("Pilih durasi Pro: 7, 14, 28, 31, atau 93 hari.") }, { status: 400 });
    }

    const actor = user!.email ?? "admin";
    const result =
      action === "grant-pro" ? await grantPro(id, actor, Number(body?.days))
      : action === "end-pro" ? await endPro(id, actor)
      : action === "ban" ? await banUser(id)
      : action === "unban" ? await unbanUser(id)
      : { ok: false, message: "Aksi tidak dikenal. Pakai grant-pro, end-pro, ban, atau unban." };

    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    if (action === "grant-pro") after(async () => {
      try { const { deliverEmailQueue } = await import("@/lib/email-notifications"); await deliverEmailQueue(1, id); }
      catch { console.error("[pro-email] Delivery remains queued"); }
    });
    const ip = await getClientIp(request);
    await logSecurity("admin_action", { action, targetUserId: id, targetEmail: target.email, days: Number(body?.days) || null }, { ip, userId: user!.userId });
    return NextResponse.json({ ok: true, message: result.message });
  } catch (e: unknown) {
    console.error("[admin]", e);
    return NextResponse.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
  }
}
