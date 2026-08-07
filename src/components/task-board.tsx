"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Circle, Search, X } from "lucide-react";
import type { Plan, Task } from "@/lib/types";

type BoardTask = Task & { feature: string; featureSlug: string; subFeature: string; subFeatureKey: string };

const columns: { title: string; status: Task["status"]; color: string; icon: React.ReactNode }[] = [
  { title: "Belum mulai", status: "pending", color: "text-slate-400", icon: <Circle size={9} /> },
  { title: "Dikerjakan", status: "in_progress", color: "text-amber-400", icon: <span className="size-2 rounded-full border border-amber-500 border-r-transparent" /> },
  { title: "Selesai", status: "done", color: "text-emerald-400", icon: <Check size={10} /> },
  { title: "Gagal", status: "failed", color: "text-red-500", icon: <X size={10} className="rounded-full border border-red-500" /> },
];

function priority(task: BoardTask) {
  if (task.layer === "frontend") return { label: "Utama", color: "text-red-400" };
  if (task.layer === "backend") return { label: "Pending", color: "text-amber-400" };
  return { label: "QA", color: "text-slate-400" };
}

function FeaturePicker({ plan, selected, onSelect }: { plan: Plan; selected: string; onSelect: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
  const selectedFeature = plan.features.find((feature) => feature.slug === selected);
  const selectedSubFeature = plan.features.flatMap((feature) => feature.subFeatures.map((subFeature) => ({ key: `${feature.slug}::${subFeature.title}`, title: subFeature.title }))).find((subFeature) => subFeature.key === selected);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const visible = plan.features.filter((feature) => feature.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div ref={wrapper} className="relative z-30 w-full max-w-[240px]">
      <button onClick={() => setOpen((value) => !value)} className={`flex h-9 w-full items-center justify-between rounded-lg border px-3 text-left text-xs font-semibold transition ${open ? "border-white/[.06] bg-white/[.03]" : "border-white/15 bg-[#0C0E10]"}`}>
        <span className="truncate">{selectedSubFeature?.title ?? selectedFeature?.title ?? "Semua fitur"}</span>
        <ChevronDown size={14} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 top-10 w-full overflow-hidden rounded-xl border border-white/15 bg-[#0C0E10] p-1.5 shadow-2xl shadow-black/70">
            <label className="flex items-center gap-2 border-b border-white/10 px-2 py-2">
              <Search size={13} className="text-slate-500" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari fitur..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
            </label>
            <div className="max-h-52 overflow-y-auto py-1">
              <button onClick={() => { onSelect("all"); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5 ${selected === "all" ? "bg-white/[.06] text-white" : "text-slate-200"}`}>
                <span className="w-3 text-[#74FA6A]">{selected === "all" ? "✓" : ""}</span>Semua fitur
              </button>
              {visible.map((feature) => (
                <div key={feature.slug}>
                  <button onClick={() => { onSelect(feature.slug); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-white/5 ${selected === feature.slug ? "text-white" : "text-slate-200"}`}>
                    <span className="w-3 text-[#74FA6A]">{selected === feature.slug ? "✓" : ""}</span><span className="truncate">{feature.title}</span>
                  </button>
                  {feature.subFeatures.map((subFeature) => {
                    const key = `${feature.slug}::${subFeature.title}`;
                    return <button key={key} onClick={() => { onSelect(key); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-left text-[11px] transition hover:bg-white/5 ${selected === key ? "text-[#74FA6A]" : "text-slate-400"}`}><span className="w-3 text-[#74FA6A]">{selected === key ? "✓" : "•"}</span><span className="truncate">{subFeature.title}</span></button>;
                  })}
                </div>
              ))}
              {visible.length === 0 && <p className="px-3 py-5 text-center text-[11px] text-slate-500">Fitur tidak ditemukan</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TaskBoard({ plan, liveTasks, compact = false }: { plan: Plan; liveTasks?: Record<string, Task["status"]>; compact?: boolean }) {
  const [selected, setSelected] = useState("all");
  const allTasks: BoardTask[] = plan.features.flatMap((feature) => feature.subFeatures.flatMap((subFeature) => subFeature.tasks.map((task) => ({ ...task, status: liveTasks?.[task.ref] ?? task.status ?? "pending", feature: feature.title, featureSlug: feature.slug, subFeature: subFeature.title, subFeatureKey: `${feature.slug}::${subFeature.title}` }))));
  const tasks = selected === "all" ? allTasks : selected.includes("::") ? allTasks.filter((task) => task.subFeatureKey === selected) : allTasks.filter((task) => task.featureSlug === selected);
  const done = tasks.filter((task) => task.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const hasNoTasks = plan.features.every((f) => f.subFeatures.every((sf) => sf.tasks.length === 0));

  if (hasNoTasks) {
    return (
      <section className={`flex flex-col items-center justify-center p-4 ${compact ? "min-h-[400px]" : "min-h-[calc(100vh-150px)]"}`}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="relative mx-auto grid size-12 place-items-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#74FA6A]" />
            <span className="size-2.5 rounded-full bg-[#74FA6A]/40" />
          </div>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[.16em] text-[#74FA6A]">sedang disusun</p>
          <p className="mt-2 max-w-[32ch] text-[13px] leading-5 text-white/40">AI sedang menyusun task untuk setiap fitur. Task akan muncul otomatis di sini.</p>
        </motion.div>
      </section>
    );
  }

  if (compact) {
    return (
      <section className="flex flex-col bg-transparent p-2.5">
        <div className="flex items-center gap-2">
          <FeaturePicker plan={plan} selected={selected} onSelect={setSelected} />
          <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/[.06]">
            <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-[#74FA6A]" />
          </div>
          <span className="shrink-0 font-mono text-[9px] text-white/35">{done}/{tasks.length}</span>
        </div>

        <div className="mt-2.5 grid flex-1 grid-cols-1 gap-1.5">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            return (
              <div key={column.status} className="rounded-lg border border-white/6 bg-white/[.02] p-1.5">
                <div className="flex items-center gap-1 px-1 py-0.5 text-[9px] font-medium text-white/40">
                  <span className={column.color}>{column.icon}</span>
                  <span>{column.title}</span>
                  <span className="ml-auto text-[8px] text-white/20">{columnTasks.length}</span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => {
                      const badge = priority(task);
                      return (
                        <motion.article key={task.ref} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border border-white/6 bg-white/[.015] p-1">
                          <div className="flex items-center gap-0.5 text-[7px]">
                            <Circle size={5} className="text-slate-600" />
                            <span className="min-w-0 flex-1 truncate text-slate-500">{task.subFeature}</span>
                            <span className={`font-medium ${badge.color}`}>{badge.label}</span>
                          </div>
                          <h3 className="mt-0.5 text-[9px] font-medium leading-3 text-white/75">{task.title}</h3>
                          <div className="mt-0.5 flex items-center justify-between text-[7px] text-slate-600">
                            <span>{task.ref}</span><span>{task.layer}</span>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                  {columnTasks.length === 0 && <p className="py-1 text-center text-[7px] text-slate-700">Kosong</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-150px)] flex-col bg-[#0A0A0A] p-4">
      <div className="flex items-center gap-2">
        <FeaturePicker plan={plan} selected={selected} onSelect={setSelected} />
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[.06]">
          <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-emerald-500" />
        </div>
        <span className="shrink-0 text-[9px] text-slate-300">{done}/{tasks.length} selesai</span>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-1 gap-2 lg:grid-cols-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div key={column.status} className="min-h-[560px] rounded-xl border border-white/15 bg-[#0C0E10] p-1.5">
              <div className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] font-semibold text-white">
                <span className={column.color}>{column.icon}</span>
                <span>{column.title}</span>
                <span className="ml-auto text-[8px] font-normal text-slate-400">{columnTasks.length}</span>
              </div>
              <div className="mt-1.5 space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map((task) => {
                    const badge = priority(task);
                    return (
                      <motion.article key={task.ref} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -1, rotate: 0.15 }} className="rounded-lg border border-white/10 bg-[#13161A] p-2 shadow-sm shadow-black/20">
                        <div className="flex items-center gap-1 text-[7px]">
                          <Circle size={6} className="text-slate-500" />
                          <span className="min-w-0 flex-1 truncate text-slate-500">{task.subFeature}</span>
                          <span className={`flex items-center gap-0.5 font-medium ${badge.color}`}>{badge.label}</span>
                        </div>
                        <h3 className="mt-0.5 text-[10px] font-medium leading-3 text-white/90">{task.title}</h3>
                        <div className="mt-1 flex items-center justify-between border-t border-white/[.06] pt-0.5 text-[7px] text-slate-600">
                          <span>{task.ref}</span><span>{task.layer}</span>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
                {columnTasks.length === 0 && <p className="py-3 text-center text-[8px] text-slate-600">Kosong</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
