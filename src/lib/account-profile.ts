import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { memoryGetUserById } from "@/lib/memory-store";

export function validateDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) return null;
  return name;
}

export async function updateAccountName(userId: string, name: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    const user = memoryGetUserById(userId);
    if (!user) return false;
    user.name = name;
    return true;
  }
  const rows = await getDb().update(users).set({ name }).where(eq(users.id, userId)).returning({ id: users.id });
  return rows.length === 1;
}
