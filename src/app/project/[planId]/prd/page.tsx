import { Shell } from "@/components/brand";
import { requirePlanForPage } from "@/lib/api-auth";
import { PrdView } from "@/components/prd-view";
import { PhysicalPrdView } from "@/components/physical-prd-view";

export default async function PrdPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlanForPage(planId);

  return (
    <Shell back={`/project/${planId}`} sidebar={false}>
      {plan.physical ? <div className="pt-16"><PhysicalPrdView plan={plan}/></div> : <PrdView plan={plan} />}
    </Shell>
  );
}
