import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyToken } from "@/lib/tokens";

export async function getAuthUser(): Promise<{ userId: string } | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const result = await verifyToken(auth.slice(7));
    if (result) return result;
  }
  return null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Token tidak valid atau telah dicabut" }, { status: 401 });
}
