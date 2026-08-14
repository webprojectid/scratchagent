import { requirePlanForPage } from "@/lib/api-auth";
import { PlanClient } from "@/components/plan-client";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlanForPage(planId);
  return <PlanClient plan={plan} />;
}
