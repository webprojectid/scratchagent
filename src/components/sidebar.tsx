"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Folder, Plus, ChevronLeft, Circle } from "lucide-react";

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

export function Sidebar() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const user = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("scratch_user") || '{}' : '{}');
    fetch(`/api/plans/list?userId=${encodeURIComponent(user.email || "shared")}`)
      .then((r) => r.json())
      .then((d) => { setPlans(d.plans ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pathname]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 248, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-16 z-20 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-hidden border-r border-white/8 bg-[#0C0E10] md:block"
          >
            <div className="flex h-full w-[248px] flex-col">
              <div className="flex items-center justify-between px-4 py-4">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-white/30">
                  <Folder size={12} /> project history
                </span>
                <button onClick={() => setOpen(false)} className="grid size-6 place-items-center rounded-md text-white/30 transition hover:bg-white/5 hover:text-white/60" aria-label="Tutup sidebar">
                  <ChevronLeft size={14} />
                </button>
              </div>

              <Link href="/new" className="mx-3 mb-2 flex items-center gap-2 rounded-[8px] border border-[#74FA6A]/15 bg-[#74FA6A]/[.03] px-3 py-2 font-mono text-[10px] tracking-wide text-[#74FA6A] transition hover:bg-[#74FA6A]/[.06]">
                <Plus size={12} /> plan baru
              </Link>

              <div className="flex-1 overflow-y-auto px-3 pb-4">
                {loading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-[8px] bg-white/4" />)}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="px-2 py-8 text-center font-mono text-[10px] leading-5 text-white/20">belum ada project</p>
                ) : (
                  <div className="space-y-1">
                    {plans.map((p) => {
                      const active = pathname === `/p/${p.id}` || pathname === `/p/${p.id}/prd`;
                      return (
                        <Link
                          key={p.id}
                          href={`/p/${p.id}`}
                          className={`block rounded-[6px] border px-2.5 py-2 transition ${active ? "border-[#74FA6A]/20 bg-[#74FA6A]/[.04]" : "border-transparent hover:border-white/6 hover:bg-white/[.02]"}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Circle size={5} className={`shrink-0 ${statusColor[p.status] ?? "text-white/25"}`} fill="currentColor" />
                            <span className={`truncate text-[11px] font-medium ${active ? "text-[#74FA6A]" : "text-white/60"}`}>{p.title}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 pl-[14px] font-mono text-[9px] text-white/20">
                            <span>{statusLabel[p.status] ?? p.status}</span>
                            <span>·</span>
                            <span>{p.taskCount} task</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="sticky top-16 z-20 hidden h-[calc(100dvh-4rem)] w-10 shrink-0 items-center justify-center border-r border-white/8 bg-[#0C0E10] text-white/30 transition hover:text-white/60 md:flex"
          aria-label="Buka sidebar"
        >
          <Folder size={16} />
        </button>
      )}
    </>
  );
}
