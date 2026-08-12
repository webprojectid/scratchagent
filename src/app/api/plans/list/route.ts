import { NextResponse } from "next/server";
import { listPlans } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "shared";
  const source = await listPlans(userId);
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
