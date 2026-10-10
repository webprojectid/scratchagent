import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { getRequestUser, unauthorized, forbidden, type AuthUser } from "./api-auth";
import { memoryGetOrCreateUser } from "./memory-store";
import { getAccountState } from "./billing";
import { rateLimit } from "./security";
import { z } from "zod";

export function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
export async function accountRequest(request: Request, write = false): Promise<{ user: AuthUser; error?: never } | { user?: never; error: NextResponse }> {
  if (write && !sameOrigin(request)) return { error: forbidden("Permintaan tidak diizinkan.") };
  let user = await getRequestUser(new URL(request.url).searchParams.get("userId"));
  if (!user) return { error: unauthorized() };
  if (user.via === "token") return { error: forbidden("Pengaturan akun hanya dapat dikelola melalui sesi browser.") };
  if (user.via === "legacy-dev" && user.email) user = { ...user, userId: memoryGetOrCreateUser(user.email).id };
  if ((await getAccountState(user.userId))?.bannedAt) return { error: forbidden("Akun dinonaktifkan.") };
  if (!write) {
    const retry = rateLimit(`account-read:${user.userId}`, 120, 60_000);
    if (retry !== null) return { error: NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retry) } }) };
  }
  if (write) {
    const retry = rateLimit(`account:${user.userId}`, 40, 60_000);
    if (retry !== null) return { error: NextResponse.json({ error: apiText("Terlalu banyak perubahan. Coba sebentar lagi.") }, { status: 429, headers: { "Retry-After": String(retry) } }) };
  }
  return { user };
}
export async function parseAccountBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.text();
  if (body.length > 32_768) throw new Error("Payload terlalu besar.");
  return schema.parse(JSON.parse(body));
}
export function accountError(error: unknown) {
  if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof Error && error.message === "Payload terlalu besar.") return NextResponse.json({ error: apiText("Data tidak valid. Periksa isian dan panjang teks.") }, { status: 400 });
  console.error("[account]", error);
  return NextResponse.json({ error: apiText("Data akun belum bisa diproses. Coba lagi.") }, { status: 503 });
}
