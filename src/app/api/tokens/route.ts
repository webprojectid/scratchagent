import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accountRequest, accountError, parseAccountBody } from "@/lib/account-api";
import { createToken, findTokenByHash, listTokens, revokeToken } from "@/lib/tokens";
import { getTokenPolicy } from "@/lib/account-store";
import { accessPlan } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security";
const input = z.object({ label: z.string().trim().min(1).max(80).default("CLI"), userId: z.string().optional(), days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30), access: z.enum(["read", "write"]).default("write"), projectIds: z.array(z.uuid()).max(30).default([]) }).strict();
export async function GET(request: Request) {
  try {
    const { user, error } = await accountRequest(request); if (error) return error;
    const rows = await listTokens(user.userId);
    return NextResponse.json(await Promise.all(rows.map(async t => {
      const hash = "hash" in t ? t.hash : t.tokenHash;
      return { hash, label: t.label, revoked: !!t.revokedAt, revokedAt: t.revokedAt, createdAt: t.createdAt, ...await getTokenPolicy(hash) };
    })), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return accountError(error); }
}
export async function POST(request: Request) {
  try {
    const data = await parseAccountBody(request, input);
    const url = new URL(request.url); if (data.userId) url.searchParams.set("userId", data.userId);
    const { user, error } = await accountRequest(new Request(url, { method: "POST", headers: request.headers }), true); if (error) return error;
    const retry = rateLimit("token-create:" + user.userId, 10, 600_000);
    if (retry !== null) return NextResponse.json({ error: apiText("Terlalu banyak token baru. Coba nanti.") }, { status: 429 });
    for (const id of data.projectIds) { const result = await accessPlan(id, user); if (result.error) return result.error; }
    const policy = { expiresAt: new Date(Date.now() + data.days * 86400_000).toISOString(), lastUsedAt: null, access: data.access, projectIds: data.projectIds };
    return NextResponse.json(await createToken(user.userId, data.label, policy));
  } catch (error) { return accountError(error); }
}
export async function DELETE(request: Request) {
  try {
    const data = await parseAccountBody(request, z.object({ hash: z.string().regex(/^[a-f0-9]{64}$/), userId: z.string().optional() }).strict());
    const url = new URL(request.url); if (data.userId) url.searchParams.set("userId", data.userId);
    const { user, error } = await accountRequest(new Request(url, { method: "DELETE", headers: request.headers }), true); if (error) return error;
    const existing = await findTokenByHash(data.hash);
    if (!existing || existing.userId !== user.userId) return NextResponse.json({ error: apiText("Token tidak ditemukan.") }, { status: 404 });
    return NextResponse.json({ ok: await revokeToken(data.hash) });
  } catch (error) { return accountError(error); }
}
