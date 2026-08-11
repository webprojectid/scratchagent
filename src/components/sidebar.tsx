"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { History, Plus, PanelLeftClose, PanelLeftOpen, FolderOpen } from "lucide-react";

interface PlanItem {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
  taskCount: number;
}

const statusColor: Record<string, string> = {
  generating: "bg-amber-400",
  ready: "bg-[#74FA6A]",
  implementing: "bg-blue-400",
  done: "bg-emerald-400",
};

const statusLabel: Record<string, string> = {
  generating: "menyusun",
  ready: "siap",
  implementing: "berjalan",
  done: "selesai",
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function Sidebar() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const user = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("scratch_user") || "{}" : "{}");
    fetch(`/api/plans/list?userId=${encodeURIComponent(user.email || "shared")}`)
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pathname]);

  return (
    <>
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-0 z-20 hidden h-[100dvh] shrink-0 overflow-hidden border-r border-white/8 bg-[#0B0D10] md:block"
          >
            <div className="flex h-full w-[264px] flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">
                  <History size={13} className="text-[#74FA6A]/70" /> riwayat project
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="grid size-6 place-items-center rounded-md text-white/25 transition hover:bg-white/5 hover:text-white/70"
                  aria-label="Tutup sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>

              {/* New plan CTA */}
              <div className="px-3 pb-3">
                <Link
                  href="/new"
                  className="flex items-center justify-center gap-2 rounded-[10px] border border-[#74FA6A]/20 bg-[#74FA6A]/[.05] px-3 py-2.5 font-mono text-[11px] font-medium tracking-[.02em] text-[#74FA6A] transition hover:border-[#74FA6A]/40 hover:bg-[#74FA6A]/[.1] active:scale-[.99]"
                >
                  <Plus size={13} /> plan baru
                </Link>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-3 pb-5">
                {loading ? (
                  <div className="space-y-2 pt-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-[10px] border border-white/5 bg-white/[.03] px-3 py-2.5">
                        <div className="h-2.5 w-3/4 rounded bg-white/8" />
                        <div className="mt-2 h-2 w-1/2 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 px-3 py-10 text-center">
                    <span className="grid size-10 place-items-center rounded-full border border-white/8 bg-white/[.03] text-white/25">
                      <FolderOpen size={16} />
                    </span>
                    <p className="text-[12px] font-medium text-white/40">Belum ada project</p>
                    <p className="text-[11px] leading-4 text-white/25">Plan yang kamu buat bakal muncul di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {plans.map((p, i) => {
                      const active = pathname === `/p/${p.id}` || pathname === `/p/${p.id}/prd`;
                      const ago = timeAgo(p.createdAt);
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Link
                            href={`/p/${p.id}`}
                            className={`group relative block overflow-hidden rounded-[10px] border px-3 py-2.5 transition-colors ${
                              active
                                ? "border-[#74FA6A]/25 bg-[#74FA6A]/[.06]"
                                : "border-white/[.06] bg-white/[.02] hover:border-white/[.14] hover:bg-white/[.045]"
                            }`}
                            aria-current={active ? "page" : undefined}
                          >
                            {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#74FA6A]" />}
                            <div className="flex items-center gap-2">
                              <span className={`size-1.5 shrink-0 rounded-full ${statusColor[p.status] ?? "bg-white/25"}`} />
                              <span className={`truncate text-[12.5px] font-medium leading-tight ${active ? "text-white" : "text-white/65 group-hover:text-white/90"}`}>
                                {p.title}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 pl-[14px] font-mono text-[9.5px] tabular-nums text-white/25">
                              <span className={active ? "text-[#74FA6A]/80" : ""}>{statusLabel[p.status] ?? p.status}</span>
                              <span className="text-white/15">·</span>
                              <span>{p.taskCount} task</span>
                              {ago && (
                                <>
                                  <span className="text-white/15">·</span>
                                  <span>{ago}</span>
                                </>
                              )}
                            </div>
                          </Link>
                        </motion.div>
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
          className="sticky top-0 z-20 hidden h-[100dvh] w-11 shrink-0 items-start justify-center border-r border-white/8 bg-[#0B0D10] pt-5 text-white/30 transition hover:text-[#74FA6A] md:flex"
          aria-label="Buka sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
    </>
  );
}
