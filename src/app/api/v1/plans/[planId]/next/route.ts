import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getNextTask } from "@/lib/tasks";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser();
  const { error } = await accessPlan(planId, user);
  if (error) return error;

  return NextResponse.json(await getNextTask(planId));
}
