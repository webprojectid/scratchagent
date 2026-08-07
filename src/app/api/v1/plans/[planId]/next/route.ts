import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { getNextTask } from "@/lib/tasks";
import { getPlan } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

  return NextResponse.json(await getNextTask(planId));
}
