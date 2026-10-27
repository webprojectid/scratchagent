"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Plan } from "@/lib/types";
import { useLang } from "@/lib/lang";
import { switchProjectDraft } from "@/lib/project-draft";
import { PhysicalPrdView } from "./physical-prd-view";
import { PhysicalTaskBoard } from "./physical-task-board";
import { AgentPromptModal } from "./agent-modal";

const PhysicalMap = dynamic(() => import("./plan-map").then(module => module.PlanMap), { ssr: false });
export function PhysicalPlanClient({ plan, isPro }: { plan: Plan; isPro: boolean }) {
  const lang = useLang(), [view, setView] = useState("roadmap"), [agent, setAgent] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (plan.status === "done") return;
    let active = true, timer: ReturnType<typeof setTimeout>;
    let previous: string | undefined;
    async function poll() {
      try {
        if (document.visibilityState === "visible") {
          const response = await fetch(`/api/plans/${encodeURIComponent(plan.id)}/progress`, { cache: "no-store" });
          if (response.ok && active) {
            const data = await response.json();
            const signature = JSON.stringify([data.status, data.features]);
            if (previous !== undefined && previous !== signature) router.refresh();
            previous = signature;
          }
        }
      } catch {}
      if (active) timer = setTimeout(() => void poll(), 10_000);
    }
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [plan.id, plan.status, router]);
  function openGeneration() {
    switchProjectDraft(sessionStorage, sessionStorage.getItem("rv_domain") === "physical" ? "physical" : "software", "physical");
    sessionStorage.setItem("rv_domain", "physical");
    sessionStorage.setItem("rv_brief", plan.brief);
    sessionStorage.setItem("rv_prefs", JSON.stringify({ mode: "custom", domain: "physical", hardware: plan.physical!.input }));
    sessionStorage.setItem("rv_handoff", JSON.stringify(plan.generationSettings ?? {}));
    sessionStorage.setItem("rv_generation_plan_id", plan.id);
    router.push("/generate/hardware");
  }
  const t = (en: string, id: string) => lang === "en" ? en : id;
  return <main className="min-h-dvh bg-[#0c0e10] text-white">
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-white/15 px-5 py-4"><div className="min-w-0"><Link href="/" className="text-sm font-semibold">Scratch Agent</Link><p className="mt-1 max-w-96 truncate text-xs text-slate-400">{plan.title} · Hardware & Robotics</p></div><nav className="flex gap-2" aria-label={t("Project views", "Tampilan proyek")}>{["roadmap", "prd", "tasks"].map(tab => <button key={tab} aria-pressed={view === tab} onClick={() => setView(tab)} className={`min-h-11 rounded px-4 text-sm focus-visible:outline-2 focus-visible:outline-white ${view === tab ? "bg-white/10" : "text-slate-400"}`}>{tab === "prd" ? "PRD" : tab === "roadmap" ? "Roadmap" : "Tasks"}</button>)}</nav><div className="flex flex-wrap gap-3">{isPro && <a href={`/api/plans/${encodeURIComponent(plan.id)}/export?format=zip`} className="flex min-h-11 items-center rounded border border-white/25 px-4 text-sm">{t("Export engineering pack", "Ekspor paket engineering")}</a>}<button disabled={plan.status === "generating"} onClick={() => setAgent(true)} className="min-h-11 rounded border border-white/25 px-4 text-sm disabled:opacity-50">{t("Agent handoff", "Handoff agent")}</button></div></header>
    {plan.status === "generating" && <div className="flex flex-wrap items-center gap-4 border-b border-white/15 px-5 py-4 text-sm"><p>{t("Generation is not finished. Implementation stays locked.", "Generation belum selesai. Implementasi tetap dikunci.")}</p><button onClick={openGeneration} className="min-h-11 rounded border border-white/30 px-4">{t("Continue saved generation", "Lanjutkan generation tersimpan")}</button></div>}
    <p className="border-b border-white/10 px-5 py-3 text-xs leading-relaxed text-slate-400">{t("Planning documents and implementation tasks are separate from physical validation. Record actual evidence before marking tasks complete.", "Dokumen dan task pengerjaan berbeda dari validasi fisik. Catat bukti nyata sebelum menyelesaikan task.")}</p>
    {view === "prd" ? <PhysicalPrdView plan={plan}/> : view === "tasks" ? <div className="relative min-h-[75dvh]"><PhysicalTaskBoard plan={plan}/></div> : <div className="relative h-[calc(100dvh-145px)] min-h-[500px]"><PhysicalMap plan={plan} /></div>}
    {agent && <AgentPromptModal planId={plan.id} physical onClose={() => setAgent(false)}/>}
  </main>;
}
