"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Circle, Folder, Plus } from "lucide-react";

interface PlanItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  taskCount: number;
}

const statusColor: Record<string, string> = {
  generating: "text-amber-400",
  ready: "text-[#74FA6A]",
  implementing: "text-blue-400",
  done: "text-emerald-400",
};

const statusLabel: Record<string, string> = {
  generating: "menyusun",
  ready: "siap",
  implementing: "berjalan",
  done: "selesai",
};

export function ProjectSwitcher({ currentId, fallbackTitle }: { currentId?: string; fallbackTitle?: string }) {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("scratch_user") || "{}");
    fetch(`/api/plans/list?userId=${encodeURIComponent(user.email || "shared")}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = plans.find((p) => p.id === currentId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[.03] px-3 text-[12px] text-slate-300 transition hover:border-white/20 hover:text-white"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Folder size={13} className="shrink-0 text-white/40" />
        <span className="max-w-[200px] truncate">{current?.title ?? fallbackTitle ?? "Project"}</span>
        <ChevronDown size={13} className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-40 mt-2 w-[300px] overflow-hidden rounded-xl border border-white/[.08] bg-[#12151A] shadow-2xl shadow-black/60"
            role="listbox"
          >
            <div className="flex items-center justify-between border-b border-white/[.06] px-3.5 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-white/30">Project history</span>
              <Link
                href="/new"
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[#74FA6A] transition hover:bg-[#74FA6A]/10"
              >
                <Plus size={11} /> baru
              </Link>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {plans.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-white/25">Belum ada project</p>
              ) : (
                plans.map((p) => {
                  const active = p.id === currentId;
                  return (
                    <Link
                      key={p.id}
                      href={`/p/${p.id}`}
                      role="option"
                      aria-selected={active}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition ${
                        active ? "bg-[#74FA6A]/[.06]" : "hover:bg-white/[.04]"
                      }`}
                    >
                      <Circle
                        size={6}
                        className={`shrink-0 ${statusColor[p.status] ?? "text-white/25"}`}
                        fill="currentColor"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[12px] font-medium leading-tight ${active ? "text-white" : "text-slate-300"}`}>
                          {p.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-white/25">
                          {statusLabel[p.status] ?? p.status} · {p.taskCount} task
                        </span>
                      </span>
                      {active && <Check size={13} className="shrink-0 text-[#74FA6A]" />}
                    </Link>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
