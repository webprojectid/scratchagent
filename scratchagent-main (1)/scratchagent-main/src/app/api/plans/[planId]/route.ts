import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import { deletePlan } from "@/lib/storage";
import { getClientIp, logSecurity } from "@/lib/security";

export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const ip = await getClientIp(request);
  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  // Hapus plan adalah fitur Pro (sesuai tabel pricing). accessPlan dengan
  // write: true sudah menolak akses demo/anonymous, jadi user pasti ada di sini.
  const account = user ? await getAccountState(user.userId) : null;
  if ((account?.tier ?? "free") !== "pro") {
    await logSecurity("access_denied", { route: "/api/plans/[id]", method: "DELETE", reason: "free tier" }, { ip, userId: user?.userId ?? null });
    return NextResponse.json({ error: "Hapus plan hanya untuk paket Pro." }, { status: 403 });
  }

  const deleted = await deletePlan(planId);
  if (deleted) await logSecurity("plan_deleted", { planId }, { ip, userId: user!.userId });
  return NextResponse.json({ ok: deleted, id: planId });
}
