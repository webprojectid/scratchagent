import { NextResponse } from "next/server";
import { getRequestUser, unauthorized } from "@/lib/api-auth";
import { getAccountDetail, isAdminEmail } from "@/lib/billing";
import { formatDisplayName } from "@/lib/user-utils";

/**
 * Identitas user login untuk client: email, role admin, tier langganan,
 * masa aktif Pro, tanggal join, dan status banned.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  if (!user) return unauthorized();
  const detail = await getAccountDetail(user.userId);
  const safeEmail = user.email ?? "";
  return NextResponse.json({
    userId: user.userId,
    email: user.email,
    name: formatDisplayName(safeEmail, detail?.name),
    role: isAdminEmail(user.email) ? "admin" : "user",
    tier: detail?.tier ?? "free",
    bannedAt: detail?.bannedAt ?? null,
    createdAt: detail?.createdAt ?? null,
    proExpiresAt: detail?.proExpiresAt ?? null,
    proActive: detail?.proActive ?? false,
  });
}
