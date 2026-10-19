"use client";
import type { Plan } from "@/lib/types";
import { useUiLanguage } from "@/lib/ui-text";

export function ProductDecisions({ plan }: { plan: Plan }) {
  const en = useUiLanguage() === "en";
  const spec = plan.productSpec;
  if (!spec) return null;
  const label = (english: string, indonesian: string) => en ? english : indonesian;
  const list = (items: string[]) => <ul className="list-disc space-y-2 pl-5">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
  return <div className="space-y-7 text-sm leading-relaxed text-slate-300">
    <section><h3 className="mb-2 font-semibold text-white">{label("Problem and audience", "Masalah dan pengguna")}</h3><p>{spec.problem}</p><p className="mt-2 text-slate-400">{spec.audiences.join(" · ")}</p></section>
    <section><h3 className="mb-2 font-semibold text-white">{label("Intended outcomes", "Hasil yang dituju")}</h3>{list(spec.outcomes)}</section>
    <section><h3 className="mb-3 font-semibold text-white">{label("Scope and traceability", "Cakupan dan penelusuran")}</h3><ol className="divide-y divide-white/10">{spec.requirements.map(requirement => <li key={requirement.id} className="py-3"><p><span className="font-mono text-xs text-slate-400">{requirement.id} · {requirement.priority}</span> — {requirement.statement}</p><p className="mt-1 text-xs text-slate-400">{label("Owning phase", "Fase pemilik")}: {plan.features.find(f => f.requirementIds?.includes(requirement.id))?.title ?? "—"}</p></li>)}</ol></section>
    {spec.outOfScope.length > 0 && <section><h3 className="mb-2 font-semibold text-white">{label("Explicit exclusions", "Pengecualian eksplisit")}</h3>{list(spec.outOfScope)}</section>}
    <section><h3 className="mb-3 font-semibold text-white">{label("Decisions and open questions", "Keputusan dan pertanyaan terbuka")}</h3><dl className="space-y-4">{spec.decisions.map(decision => <div key={decision.id}><dt className="font-medium text-white">{decision.topic} <span className="text-xs font-normal text-slate-400">({label(decision.status, ({ confirmed: "dikonfirmasi", proposed: "usulan", open: "terbuka" })[decision.status])})</span></dt><dd className="mt-1">{decision.value}</dd></div>)}</dl></section>
    <section><h3 className="mb-3 font-semibold text-white">{label("Success measurement", "Pengukuran keberhasilan")}</h3><dl className="space-y-4">{spec.metrics.map(metric => <div key={metric.name}><dt className="font-medium text-white">{metric.name}</dt><dd>{metric.definition}<p className="mt-1 text-slate-400">{metric.measurement}</p><p className="mt-1">{label("Target", "Target")}: {metric.target}</p></dd></div>)}</dl></section>
    <section><h3 className="mb-3 font-semibold text-white">{label("Risks and owners", "Risiko dan penanggung jawab")}</h3><dl className="space-y-4">{spec.risks.map(risk => <div key={risk.risk}><dt className="font-medium text-white">{risk.risk}</dt><dd>{risk.mitigation}<p className="mt-1 text-xs text-slate-400">{risk.owner}</p></dd></div>)}</dl></section>
    <section><h3 className="mb-2 font-semibold text-white">{label("Rollout", "Peluncuran")}</h3>{list(spec.rollout.stages)}</section>
    <section><h3 className="mb-2 font-semibold text-white">{label("Release checks", "Pemeriksaan rilis")}</h3>{list(spec.rollout.releaseChecks)}</section>
    <section><h3 className="mb-2 font-semibold text-white">Rollback</h3>{list(spec.rollout.rollback)}</section>
  </div>;
}
