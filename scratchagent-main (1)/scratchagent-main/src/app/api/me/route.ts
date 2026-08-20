import { NextResponse } from "next/server";
import { getRequestUser, unauthorized } from "@/lib/api-auth";
import { getAccountState, isAdminEmail } from "@/lib/billing";

/**
 * Identitas user login untuk client: email, role admin, tier langganan,
 * dan status banned. Dipakai profile page untuk menampilkan tag Admin
 * dan menu Developer settings.
 */
export async function GET() {
  const user = await getRequestUser();
  if (!user) return unauthorized();
  const account = await getAccountState(user.userId);
  return NextResponse.json({
    userId: user.userId,
    email: user.email,
    role: isAdminEmail(user.email) ? "admin" : "user",
    tier: account?.tier ?? "free",
    bannedAt: account?.bannedAt ?? null,
  });
}
