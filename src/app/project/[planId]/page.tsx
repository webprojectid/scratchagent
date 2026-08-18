import { requirePlanForPage, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import { PlanClient } from "@/components/plan-client";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlanForPage(planId);
  // Tier user dipakai client untuk mengunci/membuka edit struktur (fitur Pro).
  const user = await getRequestUser();
  const account = user ? await getAccountState(user.userId) : undefined;
  return <PlanClient plan={plan} tier={account?.tier ?? "free"} />;
}
