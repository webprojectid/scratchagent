"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Circle, Search, X } from "lucide-react";
import type { Plan, Task } from "@/lib/types";

type BoardTask = Task & { feature: string; featureSlug: string; subFeature: string; subFeatureKey: string };

const EASE = [0.32, 0.72, 0, 1] as const;

const columns: { title: string; status: Task["status"]; chip: string; icon: React.ReactNode; bar: string }[] = [
  {
    title: "Belum mulai",
    status: "pending",
    chip: "border-slate-400/25 bg-slate-400/[.07] text-slate-300",
    bar: "bg-slate-500/70",
    icon: <Circle size={10} strokeWidth={1.5} />,
  },
  {
    title: "Dikerjakan",
    status: "in_progress",
    chip: "border-amber-400/25 bg-amber-400/[.08] text-amber-300",
    bar: "bg-amber-400",
    icon: <span className="size-2 animate-spin rounded-full border-[1.5px] border-amber-400 border-r-transparent" />,
  },
  {
    title: "Selesai",
    status: "done",
    chip: "border-[#74FA6A]/25 bg-[#74FA6A]/[.08] text-[#74FA6A]",
    bar: "bg-[#74FA6A]",
    icon: <Check size={10} strokeWidth={1.5} />,
  },
  {
    title: "Gagal",
    status: "failed",
    chip: "border-rose-400/25 bg-rose-400/[.08] text-rose-300",
    bar: "bg-rose-500",
    icon: <X size={10} strokeWidth={1.5} />,
  },
];

const layerStyle: Record<string, { label: string; badge: string; dot: string }> = {
  frontend: { label: "Frontend", badge: "border-violet-400/25 bg-violet-400/[.08] text-violet-300", dot: "bg-violet-400" },
  backend: { label: "Backend", badge: "border-sky-400/25 bg-sky-400/[.08] text-sky-300", dot: "bg-sky-400" },
  qa: { label: "QA", badge: "border-amber-400/25 bg-amber-400/[.08] text-amber-300", dot: "bg-amber-400" },
};

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
      <button
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-full items-center justify-between rounded-full border px-4 text-left text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "border-[#74FA6A]/30 bg-[#74FA6A]/[.05]" : "border-white/12 bg-[#0C0E10] hover:border-white/25"
        }`}
      >
        <span className="truncate">{selectedSubFeature?.title ?? selectedFeature?.title ?? "Semua fitur"}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={`shrink-0 text-slate-400 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute left-0 top-11 w-full overflow-hidden rounded-2xl border border-white/12 bg-[#0C0E10] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <label className="flex items-center gap-2 border-b border-white/[.07] px-3 py-2">
              <Search size={13} strokeWidth={1.5} className="text-slate-500" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari fitur..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
            </label>
            <div className="max-h-52 overflow-y-auto py-1">
              <button onClick={() => { onSelect("all"); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${selected === "all" ? "bg-white/[.06] text-white" : "text-slate-200"}`}>
                <span className="w-3 text-[#74FA6A]">{selected === "all" ? "✓" : ""}</span>Semua fitur
              </button>
              {visible.map((feature) => (
                <div key={feature.slug}>
                  <button onClick={() => { onSelect(feature.slug); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-white/5 ${selected === feature.slug ? "text-white" : "text-slate-200"}`}>
                    <span className="w-3 text-[#74FA6A]">{selected === feature.slug ? "✓" : ""}</span><span className="truncate">{feature.title}</span>
                  </button>
                  {feature.subFeatures.map((subFeature) => {
                    const key = `${feature.slug}::${subFeature.title}`;
                    return <button key={key} onClick={() => { onSelect(key); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-left text-[11px] transition-colors hover:bg-white/5 ${selected === key ? "text-[#74FA6A]" : "text-slate-400"}`}><span className="w-3 text-[#74FA6A]">{selected === key ? "✓" : "•"}</span><span className="truncate">{subFeature.title}</span></button>;
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

function TaskCard({ task, compact }: { task: BoardTask; compact?: boolean }) {
  const layer = layerStyle[task.layer] ?? layerStyle.qa;
  const accent = columns.find((c) => c.status === task.status)?.bar ?? "bg-slate-500/70";

  if (compact) {
    return (
      <motion.article
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3, ease: EASE }}
        className={`relative overflow-hidden rounded-lg border bg-white/[.02] p-1.5 pl-2.5 ${task.status === "in_progress" ? "border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.12)]" : "border-white/[.05]"}`}
      >
        <span className={`absolute bottom-1 left-0 top-1 w-[2px] rounded-r-full ${accent} ${task.status === "in_progress" ? "animate-pulse" : ""}`} />
        <div className="flex items-center gap-1 text-[8px]">
          <span className="min-w-0 flex-1 truncate text-slate-500">{task.subFeature}</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[7px] font-semibold uppercase tracking-wide ${layer.badge}`}>
            <span className={`size-[3px] rounded-full ${layer.dot}`} />{layer.label}
          </span>
        </div>
        <h3 className={`mt-0.5 text-[10px] font-medium leading-4 ${task.status === "done" ? "line-through decoration-white/25 text-white/30" : "text-white/80"}`}>{task.title}</h3>
        <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[7px] tabular-nums text-slate-600">
          <span className="flex min-w-0 items-center gap-1">
            {task.status === "in_progress" && <span className="size-1.5 shrink-0 animate-spin rounded-full border border-amber-400 border-r-transparent" />}
            <span className="truncate">{task.ref}</span>
          </span>
          <span>P{task.phase}</span>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`group relative overflow-hidden rounded-xl border bg-[#0E1114] p-3 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#12161B] ${task.status === "in_progress" ? "border-amber-400/35 shadow-[0_0_18px_rgba(251,191,36,0.14)]" : "border-white/[.06] hover:border-white/[.14]"}`}
    >
      <span className={`absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full ${accent} transition-all duration-300 group-hover:bottom-2 group-hover:top-2 ${task.status === "in_progress" ? "animate-pulse" : ""}`} />

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${layer.badge}`}>
          <span className={`size-1 rounded-full ${layer.dot}`} />
          {layer.label}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] tabular-nums text-slate-500">
          {task.status === "in_progress" && <span className="size-2 animate-spin rounded-full border border-amber-400 border-r-transparent" />}
          {task.ref}
        </span>
      </div>

      <h3 className={`mt-2 text-[13px] font-medium leading-snug ${task.status === "done" ? "line-through decoration-white/25 text-white/35" : "text-white/90"}`}>{task.title}</h3>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[.05] pt-2">
        <span className="min-w-0 flex-1 truncate text-[10px] text-slate-500">{task.subFeature}</span>
        <span className="shrink-0 rounded-full bg-white/[.05] px-2 py-0.5 font-mono text-[9px] tabular-nums text-slate-400">P{task.phase}</span>
      </div>
    </motion.article>
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
      <section className={`flex flex-col items-center justify-center p-4 ${compact ? "min-h-[400px]" : "min-h-[calc(100dvh-150px)]"}`}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="text-center">
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
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[.06]">
            <motion.div initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: EASE }} className="h-full rounded-full bg-gradient-to-r from-[#74FA6A]/60 to-[#74FA6A]" />
          </div>
          <span className="shrink-0 font-mono text-[9px] tabular-nums text-white/35">{done}/{tasks.length}</span>
        </div>

        <div className="mt-2.5 grid flex-1 grid-cols-1 gap-1.5">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            return (
              <div key={column.status} className="rounded-xl border border-white/[.05] bg-white/[.015] p-1.5">
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[9px] font-semibold text-white/45">
                  <span className={`grid size-4 place-items-center rounded-full border ${column.chip}`}>{column.icon}</span>
                  <span>{column.title}</span>
                  {column.status === "in_progress" && columnTasks.length > 0 && (
                    <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-wider text-amber-400">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
                      </span>
                      live
                    </span>
                  )}
                  <span className="ml-auto rounded-full bg-white/[.05] px-1.5 font-mono text-[8px] tabular-nums text-white/25">{columnTasks.length}</span>
                </div>
                <div className="mt-1 space-y-1">
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => <TaskCard key={task.ref} task={task} compact />)}
                  </AnimatePresence>
                  {columnTasks.length === 0 && <p className="py-1.5 text-center text-[8px] text-slate-700">Kosong</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100dvh-150px)] flex-col bg-[#0A0A0A] px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl border border-white/[.06] bg-white/[.02] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <FeaturePicker plan={plan} selected={selected} onSelect={setSelected} />
        <div className="flex min-w-[160px] flex-1 items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
            <motion.div
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: EASE }}
              className="h-full rounded-full bg-gradient-to-r from-[#74FA6A]/60 to-[#74FA6A] shadow-[0_0_14px_rgba(116,250,106,0.5)]"
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-300">{done}/{tasks.length} selesai</span>
        </div>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column, i) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <motion.div
              key={column.status}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
              className="flex min-h-[480px] flex-col rounded-2xl border border-white/[.06] bg-white/[.02] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="flex flex-1 flex-col rounded-[calc(1rem-0.25rem)] bg-[#0A0C0E]/80 p-2">
                <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                  <span className={`grid size-5 place-items-center rounded-full border ${column.chip}`}>{column.icon}</span>
                  <span className="text-[12px] font-semibold text-white/85">{column.title}</span>
                  {column.status === "in_progress" && columnTasks.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/[.08] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
                      </span>
                      live
                    </span>
                  )}
                  <span className="ml-auto rounded-full bg-white/[.05] px-2 py-0.5 font-mono text-[10px] tabular-nums text-slate-400">{columnTasks.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => <TaskCard key={task.ref} task={task} />)}
                  </AnimatePresence>
                  {columnTasks.length === 0 && (
                    <div className="grid place-items-center rounded-xl border border-dashed border-white/[.06] py-8">
                      <p className="text-[10px] text-slate-600">Kosong</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
