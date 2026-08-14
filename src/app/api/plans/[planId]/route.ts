import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { deletePlan } from "@/lib/storage";

export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  const deleted = await deletePlan(planId);
  return NextResponse.json({ ok: deleted, id: planId });
}
