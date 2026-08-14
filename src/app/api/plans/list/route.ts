import { NextResponse } from "next/server";
import { getRequestUser, planOwnerKey, unauthorized } from "@/lib/api-auth";
import { listPlans } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Param userId hanya dipakai sebagai fallback di mode dev polos (tanpa DB & Supabase).
  const user = await getRequestUser(searchParams.get("userId"));
  if (!user) return unauthorized();

  const source = await listPlans(planOwnerKey(user));
  const plans = source.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    createdAt: p.createdAt,
    userId: p.userId ?? null,
    taskCount: (p.features ?? []).reduce((acc: number, f) => acc + (f.subFeatures ?? []).reduce((a: number, sf) => a + (sf.tasks?.length ?? 0), 0), 0),
  }));
  return NextResponse.json({ plans });
}
