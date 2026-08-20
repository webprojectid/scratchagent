import { NextResponse } from "next/server";
import { getRequestUser, unauthorized } from "@/lib/api-auth";
import { createToken, findTokenByHash, listTokens, revokeToken } from "@/lib/tokens";
import { RATE_LIMITS, clientKey, getClientIp, logSecurity, rateLimit, rateLimitedResponse } from "@/lib/security";

// Semua operasi token terikat ke identitas terautentikasi (session/Bearer).
// userId dari body client TIDAK lagi dipercaya: token hanya bisa dibuat
// untuk user yang sedang login, dan hanya token miliknya yang terlihat/dicabut.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  if (!user) return unauthorized();

  try {
    const rows = await listTokens(user.userId);
    return NextResponse.json(
      (rows as Array<{ hash?: string; tokenHash?: string; label: string; revokedAt?: string | Date | null; createdAt?: string | Date }>).map((t) => ({
        hash: t.hash ?? t.tokenHash,
        label: t.label,
        revoked: !!t.revokedAt,
        createdAt: t.createdAt,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  let label = "CLI";
  let legacyUserId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.label === "string" && body.label.trim()) label = body.label.trim();
    if (typeof body?.userId === "string" && body.userId) legacyUserId = body.userId;
  } catch {
    /* body opsional */
  }

  const user = await getRequestUser(legacyUserId);
  if (!user) return unauthorized();

  // Rem laju: cegah spam pembuatan token (vektor penyalahgunaan akun).
  const ip = await getClientIp(request);
  const rl = RATE_LIMITS.tokens;
  const retryIn = rateLimit(clientKey(user.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user.userId, ip), retryIn, { ip, userId: user.userId, route: "/api/tokens" });

  const result = await createToken(user.userId, label);
  await logSecurity("admin_action", { action: "token_created", label }, { ip, userId: user.userId });
  return NextResponse.json({ token: result.token, hash: result.hash });
}

export async function DELETE(request: Request) {
  let hash = "";
  let legacyUserId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.hash === "string") hash = body.hash;
    if (typeof body?.userId === "string" && body.userId) legacyUserId = body.userId;
  } catch {
    /* empty */
  }
  if (!hash) return NextResponse.json({ error: "Hash wajib" }, { status: 400 });

  const user = await getRequestUser(legacyUserId);
  if (!user) return unauthorized();

  // Ownership: hanya token milik sendiri yang boleh dicabut.
  const existing = await findTokenByHash(hash);
  if (!existing || existing.userId !== user.userId) {
    return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 404 });
  }

  const ok = await revokeToken(hash);
  return NextResponse.json({ ok });
}
