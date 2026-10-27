import { hasProFeatures } from "@/lib/account-capabilities";
import { requirePlanForPage, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import { PlanClient } from "@/components/plan-client";
import { ProjectVisited } from "@/components/project-visited";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlanForPage(planId);
  // Tier user dipakai client untuk mengunci/membuka edit struktur (fitur Pro).
  const user = await getRequestUser();
  const account = user ? await getAccountState(user.userId) : undefined;
  const isPro = hasProFeatures(user, account?.tier);
  return <><ProjectVisited planId={planId}/><PlanClient plan={plan} tier={isPro ? "pro" : "free"} /></>;
}
