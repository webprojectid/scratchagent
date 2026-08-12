import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { deletePlan, getPlan } from "@/lib/storage";

export async function DELETE(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { planId } = await params;
  const existing = await getPlan(planId);
  if (!existing) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });
  const deleted = await deletePlan(planId);
  return NextResponse.json({ ok: deleted, id: planId });
}
