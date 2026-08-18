import { NextResponse } from "next/server";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { listAccounts } from "@/lib/billing";
import { RATE_LIMITS, clientKey, getClientIp, logSecurity, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * Daftar akun untuk admin. Query: ?q=<email/nama> untuk mencari.
 * Return: id, email, nama, tier, banned, tanggal daftar, status Pro aktif.
 */
export async function GET(request: Request) {
  const user = await getRequestUser();
  const gate = await requireAdmin(user);
  if (gate) {
    const ip = await getClientIp(request);
    await logSecurity("access_denied", { route: "/api/admin/users", reason: "not admin" }, { ip, userId: user?.userId ?? null });
    return gate;
  }
  const rl = RATE_LIMITS.admin;
  const ip = await getClientIp(request);
  const retryIn = rateLimit(clientKey(user!.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user!.userId, ip), retryIn, { ip, userId: user!.userId, route: "/api/admin/users" });
  try {
    const { searchParams } = new URL(request.url);
    const accounts = await listAccounts(searchParams.get("q") ?? undefined);
    return NextResponse.json({ accounts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Gagal memuat daftar akun" }, { status: 500 });
  }
}
