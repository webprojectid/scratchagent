import { notFound } from "next/navigation";
import { Shell } from "@/components/brand";
import { getPlan } from "@/lib/storage";

export default async function PrdPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) notFound();

  return (
    <Shell>
      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">Product requirements document</p>
        <h1 className="mt-3 text-5xl font-black">{plan.title}</h1>
        <p className="mt-5 text-lg text-slate-400">{plan.brief}</p>
        <h2 className="mt-10 text-2xl">Stack</h2>
        <p className="mt-3 text-slate-400">{plan.stack.join(" · ")}</p>
        <h2 className="mt-10 text-2xl">Asumsi</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-400">
          {plan.asumsi.map((x) => <li key={x}>{x}</li>)}
        </ul>
        {plan.features.map((f) => (
          <section key={f.slug} className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-3xl">{f.title}</h2>
            <p className="mt-3 text-slate-400">{f.description}</p>
            <h3 className="mt-5">Tujuan</h3>
            <p className="text-slate-400">{f.tujuan}</p>
            <h3 className="mt-5">Selesai bila</h3>
            <ul className="mt-2 list-disc pl-5 text-slate-400">
              {f.selesaiBila.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </section>
        ))}
      </article>
    </Shell>
  );
}
