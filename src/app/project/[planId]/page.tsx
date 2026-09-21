import { requirePlanForPage, getRequestUser } from "@/lib/api-auth";
import { getAccountState, isAdminEmail } from "@/lib/billing";
import { PlanClient } from "@/components/plan-client";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlanForPage(planId);
  // Tier user dipakai client untuk mengunci/membuka edit struktur (fitur Pro).
  const user = await getRequestUser();
  const account = user ? await getAccountState(user.userId) : undefined;
  const isSuperUser = user?.email ? isAdminEmail(user.email) : false;
  return <PlanClient plan={plan} tier={isSuperUser ? "pro" : (account?.tier ?? "free")} />;
}
