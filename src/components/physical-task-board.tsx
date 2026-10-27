"use client";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Plan, TaskStatus } from "@/lib/types";
import { useLang } from "@/lib/lang";
import { RoadmapTaskPanel } from "./plan-map";

export function PhysicalTaskBoard({ plan }: { plan: Plan }) {
  const lang = useLang(), [selected, setSelected] = useState<string | null>(null);
  const t = (en: string, id: string) => lang === "en" ? en : id;
  const groups: [TaskStatus, string][] = [["pending", t("Not started", "Belum dimulai")], ["in_progress", t("In progress", "Dikerjakan")], ["done", t("Completed", "Selesai")], ["failed", t("Failed", "Gagal")]];
  const tasks = plan.features.flatMap(phase => phase.subFeatures.flatMap(work => work.tasks));
  return <div className="p-5">
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">{groups.map(([status, title]) => <section key={status}>
      <h2 className="mb-4 flex items-center justify-between border-b border-white/20 pb-4 text-sm font-medium">{title}<span className="font-mono text-xs text-slate-400">{tasks.filter(task => task.status === status).length}</span></h2>
      <div className="space-y-3">{tasks.filter(task => task.status === status).map(task => <button key={task.ref} onClick={() => setSelected(task.ref)} className="block w-full rounded border border-white/15 bg-white/[.025] p-4 text-left hover:border-white/35 focus-visible:outline-2 focus-visible:outline-white">
        <span className="block text-[11px] text-slate-400">{task.ref} · {task.hardware?.discipline.replaceAll("_", " ")}</span>
        <span className="mt-3 block text-sm font-medium leading-relaxed">{task.title}</span>
        <span className="mt-3 block text-xs text-slate-400">{t("Executor", "Pelaksana")}: {task.hardware?.executor}{task.hardware?.waitReason ? ` · ${t("Waiting for", "Menunggu")}: ${task.hardware.waitReason}` : ""}</span>
      </button>)}{!tasks.some(task => task.status === status) && <p className="text-xs text-slate-400">{t("No tasks", "Tidak ada task")}</p>}</div>
    </section>)}</div>
    <AnimatePresence>{selected && <div className="pointer-events-none fixed inset-0 z-50"><RoadmapTaskPanel plan={plan} taskRef={selected} onSelect={setSelected} onClose={() => setSelected(null)}/></div>}</AnimatePresence>
  </div>;
}
