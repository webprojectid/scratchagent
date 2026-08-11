import { notFound } from "next/navigation";
import { Shell } from "@/components/brand";
import { getPlan } from "@/lib/storage";
import { PrdView } from "@/components/prd-view";

export default async function PrdPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) notFound();

  return (
    <Shell back={`/p/${planId}`} sidebar={false}>
      <PrdView plan={plan} />
    </Shell>
  );
}
