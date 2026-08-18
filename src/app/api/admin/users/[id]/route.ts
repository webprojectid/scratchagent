import { NextResponse } from "next/server";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { banUser, endPro, getAccountDetail, grantPro, isAdminEmail, unbanUser } from "@/lib/billing";
import { getClientIp, logSecurity } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

/** Detail lengkap satu akun: tier, riwayat Pro, catatan pemakaian. */
export async function GET(_request: Request, { params }: Params) {
  const user = await getRequestUser();
  const gate = await requireAdmin(user);
  if (gate) return gate;
  try {
    const { id } = await params;
    const detail = await getAccountDetail(id);
    if (!detail) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ account: detail });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Gagal memuat detail akun" }, { status: 500 });
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
  const user = await getRequestUser();
  const gate = await requireAdmin(user);
  if (gate) {
    const ip = await getClientIp(request);
    await logSecurity("access_denied", { route: "/api/admin/users/[id]", method: "POST", reason: "not admin" }, { ip, userId: user?.userId ?? null });
    return gate;
  }
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // Admin tidak boleh mem-banned dirinya sendiri, dan tidak boleh
    // mengubah langganan sesama admin.
    const target = await getAccountDetail(id);
    if (!target) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    if (isAdminEmail(target.email)) {
      return NextResponse.json({ error: "Akun admin tidak bisa diubah lewat menu ini." }, { status: 400 });
    }

    if (action === "grant-pro" && !Number.isFinite(Number(body?.days))) {
      return NextResponse.json({ error: "Pilih durasi Pro: 7, 14, 28, 31, atau 93 hari." }, { status: 400 });
    }

    const actor = user!.email ?? "admin";
    const result =
      action === "grant-pro" ? await grantPro(id, actor, Number(body?.days))
      : action === "end-pro" ? await endPro(id, actor)
      : action === "ban" ? await banUser(id)
      : action === "unban" ? await unbanUser(id)
      : { ok: false, message: "Aksi tidak dikenal. Pakai grant-pro, end-pro, ban, atau unban." };

    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    const ip = await getClientIp(request);
    await logSecurity("admin_action", { action, targetUserId: id, targetEmail: target.email, days: Number(body?.days) || null }, { ip, userId: user!.userId });
    return NextResponse.json({ ok: true, message: result.message });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Aksi gagal" }, { status: 500 });
  }
}
