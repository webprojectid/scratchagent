"use client";
import type { Plan } from "@/lib/types";
import { useLang } from "@/lib/lang";
import { physicalPrdSections } from "./physical-prd-sections";

export function PhysicalPrdView({ plan }: { plan: Plan }) {
  const lang = useLang();
  const t = (en: string, id: string) => lang === "en" ? en : id;
  const sections = physicalPrdSections(plan, lang);
  const tasks = plan.features.flatMap(phase => phase.subFeatures.flatMap(work => work.tasks));
  const stats = [[t("Phases", "Fase"), plan.features.length], [t("Work packages", "Paket pekerjaan"), plan.features.reduce((total, phase) => total + phase.subFeatures.length, 0)], [t("Completed tasks", "Task selesai"), `${tasks.filter(task => task.status === "done").length}/${tasks.length}`]];
  return <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label={t("Engineering document contents", "Daftar isi dokumen engineering")} className="flex gap-4 overflow-x-auto md:sticky md:top-6 md:max-h-[85dvh] md:flex-col md:gap-0 md:self-start md:overflow-y-auto">
      {sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="flex min-h-11 shrink-0 items-center gap-3 border-l border-white/15 px-3 py-2 text-xs leading-relaxed text-slate-300 hover:text-white focus-visible:outline-2 focus-visible:outline-white"><span className="font-mono text-slate-400">{String(index + 1).padStart(2, "0")}</span>{section.title}</a>)}
    </nav>
    <article className="min-w-0">
      <p className="mb-4 text-xs tracking-widest text-slate-400">{t("PRODUCT REQUIREMENTS & ENGINEERING PLAN", "KEBUTUHAN PRODUK & RENCANA ENGINEERING")}</p>
      <h1 className="text-3xl font-medium leading-tight tracking-tight">{plan.title}</h1>
      <dl className="my-8 grid grid-cols-3 gap-5 border-y border-white/15 py-5">{stats.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-2 text-xl tabular-nums">{value}</dd></div>)}</dl>
      <div className="space-y-12">{sections.map((section, index) => <section key={section.id} id={section.id} className="scroll-mt-8"><h2 className="mb-5 flex gap-4 border-t border-white/15 pt-5 text-xl font-medium"><span className="pt-1 font-mono text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>{section.body}</section>)}</div>
    </article>
  </div>;
}
