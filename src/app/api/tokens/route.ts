import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createToken, listTokens, revokeToken } from "@/lib/tokens";

async function getOrCreateUser(email: string): Promise<string> {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing[0]) return existing[0].id;
  const result = await db.insert(users).values({ email, name: email.split("@")[0] } as any).returning();
  return result[0].id;
}

export async function GET() {
  try {
    const db = getDb();
    const allUsers = await db.select().from(users);
    const tokens: any[] = [];
    for (const user of allUsers) {
      const userTokens = await listTokens(user.id);
      tokens.push(...userTokens);
    }
    return NextResponse.json(tokens.map((t: any) => ({ hash: t.tokenHash, label: t.label, revoked: !!t.revokedAt, createdAt: t.createdAt })));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const { label, userId } = await request.json().catch(() => ({ label: "CLI", userId: "" }));
  const actualUserId = userId || await getOrCreateUser("admin@scratchagent.com");
  const result = await createToken(actualUserId, label ?? "CLI");
  return NextResponse.json({ token: result.token, hash: result.hash });
}

export async function DELETE(request: Request) {
  const { hash } = await request.json().catch(() => ({}));
  if (!hash) return NextResponse.json({ error: "Hash wajib" }, { status: 400 });
  const ok = await revokeToken(hash);
  return NextResponse.json({ ok });
}
