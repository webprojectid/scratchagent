import { writeOriginGate } from "@/lib/write-origin";
import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { getRequestUser, unauthorized } from "@/lib/api-auth";
import { getAccountSummary, isAdminEmail } from "@/lib/billing";
import { formatDisplayName } from "@/lib/user-utils";
import { updateAccountName, validateDisplayName } from "@/lib/account-profile";
import { memoryGetOrCreateUser } from "@/lib/memory-store";
import { rateLimit } from "@/lib/security";

async function accountUser(request: Request) {
  const user = await getRequestUser(new URL(request.url).searchParams.get("userId"));
  if (user?.via === "legacy-dev" && user.email) {
    return { ...user, userId: memoryGetOrCreateUser(user.email).id };
  }
  return user;
}

/**
 * Identitas user login untuk client: email, role admin, tier langganan,
 * masa aktif Pro, tanggal join, dan status banned.
 */
export async function GET(request: Request) {
  const user = await accountUser(request);
  if (!user) return unauthorized();
  const detail = await getAccountSummary(user.userId);
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
    emailVerified: user.emailVerified ?? null,
  });
}

export async function PATCH(request: Request) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const source = new URL(origin);
      const host = request.headers.get("host") ?? new URL(request.url).host;
      if (source.host !== host || !["https:", "http:"].includes(source.protocol)) throw new Error("Cross-origin request");
    } catch {
      return NextResponse.json({ error: apiText("Permintaan tidak diizinkan.") }, { status: 403 });
    }
  }
  const user = await accountUser(request);
  if (!user) return unauthorized();
  if (user.via === "token") return NextResponse.json({ error: apiText("Sesi browser diperlukan.") }, { status: 403 });
  const retryAfter = rateLimit(`profile:${user.userId}`, 20, 10 * 60 * 1000);
  if (retryAfter !== null) return NextResponse.json({ error: apiText("Terlalu banyak perubahan. Coba lagi sebentar.") }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

  let name: string | null;
  try {
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: apiText("Permintaan terlalu besar.") }, { status: 413 });
    name = validateDisplayName(JSON.parse(text)?.name);
  } catch {
    return NextResponse.json({ error: apiText("Data profil tidak valid.") }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: apiText("Nama harus berisi 1 sampai 80 karakter tanpa baris baru.") }, { status: 400 });
  try {
    const detail = await getAccountSummary(user.userId);
    if (detail?.bannedAt) return NextResponse.json({ error: apiText("Akun dinonaktifkan.") }, { status: 403 });
    if (!await updateAccountName(user.userId, name)) return NextResponse.json({ error: apiText("Akun tidak ditemukan.") }, { status: 404 });
    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ error: apiText("Profil belum bisa disimpan. Coba lagi.") }, { status: 500 });
  }
}
