import { notFound } from "next/navigation";
import { getPlan } from "@/lib/storage";
import { PlanClient } from "@/components/plan-client";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) notFound();
  return <PlanClient plan={plan} />;
}
