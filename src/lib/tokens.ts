import { createHash, randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { tokens } from "@/db/schema";
import { getTokenPolicy, saveTokenPolicy, touchToken, type TokenPolicy } from "./account-store";
import {
  memoryCreateToken,
  memoryFindTokenByHash,
  memoryGetOrCreateUser,
  memoryListTokens,
  memoryRevokeToken,
} from "./memory-store";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return `rv_${randomBytes(24).toString("hex")}`;
}

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

export async function createToken(userId: string, label: string, policy?: TokenPolicy): Promise<{ token: string; hash: string }> {
  const token = generateToken();
  const hash = hashToken(token);
  if (isMemoryMode()) {
    memoryCreateToken(userId, hash, label);
    if (policy) await saveTokenPolicy(hash, policy);
    return { token, hash };
  }
  const db = getDb();
  await db.insert(tokens).values({ userId, tokenHash: hash, label } as any);
  if (policy) await saveTokenPolicy(hash, policy);
  return { token, hash };
}

export async function findTokenByHash(hash: string) {
  if (isMemoryMode()) return memoryFindTokenByHash(hash);
  const db = getDb();
  const rows = await db.select().from(tokens).where(and(eq(tokens.tokenHash, hash), isNull(tokens.revokedAt)));
  return rows[0] ?? null;
}

export async function listTokens(userId: string) {
  if (isMemoryMode()) return memoryListTokens(userId);
  const db = getDb();
  return db.select().from(tokens).where(eq(tokens.userId, userId));
}

export async function revokeToken(hash: string): Promise<boolean> {
  if (isMemoryMode()) return memoryRevokeToken(hash);
  const db = getDb();
  const result = await db.update(tokens).set({ revokedAt: new Date() } as any).where(eq(tokens.tokenHash, hash));
  return (result.rowCount ?? 0) > 0;
}

export async function verifyToken(token: string): Promise<{ userId: string; policy: TokenPolicy } | null> {
  const hash = hashToken(token);
  const t = await findTokenByHash(hash);
  if (!t) return null;
  const policy = await getTokenPolicy(hash);
  if (policy.expiresAt && Date.parse(policy.expiresAt) <= Date.now()) return null;
  await touchToken(hash);
  return { userId: t.userId, policy };
}

export { memoryGetOrCreateUser };
