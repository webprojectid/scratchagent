"use client";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { History, Plus, PanelLeftClose, PanelLeftOpen, FolderOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";

interface PlanItem {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
  taskCount: number;
}

const statusColor: Record<string, string> = {
  generating: "bg-primary",
  ready: "bg-primary",
  implementing: "bg-primary",
  done: "bg-primary",
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
  return new Date(iso).toLocaleDateString(uiLocale(), { day: "numeric", month: "short" });
}

export function Sidebar() {
  useUiLanguage();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      fetch(`/api/plans/list?userId=${encodeURIComponent(u?.email ?? "shared")}`)
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          setPlans(d.plans ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
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
            className="sticky top-0 z-20 hidden h-[100dvh] shrink-0 overflow-hidden border-r border-border bg-background md:block"
          >
            <div className="flex h-full w-[264px] flex-col">
              {/* Brand */}
              <div className="px-4 pb-3 pt-5">
                <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold tracking-[-.03em] text-foreground transition hover:text-primary">
                  Scratch Agent
                </Link>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                  <History size={13} className="text-primary/70" /> riwayat project
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                  aria-label="Tutup sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>

              {/* New plan CTA */}
              <div className="px-3 pb-3">
                <Link
                  href="/new"
                  className="flex items-center justify-center gap-2 rounded-[10px] border border-primary/20 bg-primary/[.05] px-3 py-2.5 font-mono text-[11px] font-medium tracking-[.02em] text-primary transition hover:border-primary/40 hover:bg-primary/[.1] active:scale-[.99]"
                >
                  <Plus size={13} /> plan baru
                </Link>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-3 pb-5">
                {loading ? (
                  <div className="space-y-2 pt-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-[10px] border border-border bg-foreground/[.03] px-3 py-2.5">
                        <div className="h-2.5 w-3/4 rounded bg-foreground/8" />
                        <div className="mt-2 h-2 w-1/2 rounded bg-foreground/5" />
                      </div>
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 px-3 py-10 text-center">
                    <span className="grid size-10 place-items-center rounded-full border border-border bg-foreground/[.03] text-muted-foreground">
                      <FolderOpen size={16} />
                    </span>
                    <p className="text-[12px] font-medium text-muted-foreground">{ui("Belum ada project")}</p>
                    <p className="text-[11px] leading-4 text-muted-foreground">{ui("Plan yang kamu buat bakal muncul di sini.")}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {plans.map((p, i) => {
                      const active = pathname === `/project/${p.id}` || pathname === `/project/${p.id}/prd`;
                      const ago = timeAgo(p.createdAt);
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Link
                            href={`/project/${p.id}`}
                            className={`group relative block overflow-hidden rounded-[10px] border px-3 py-2.5 transition-colors ${
                              active
                                ? "border-primary/25 bg-primary/[.06]"
                                : "border-border bg-foreground/[.02] hover:border-border hover:bg-foreground/[.045]"
                            }`}
                            aria-current={active ? "page" : undefined}
                          >
                            {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                            <div className="flex items-center gap-2">
                              <span className={`size-1.5 shrink-0 rounded-full ${statusColor[p.status] ?? "bg-foreground/25"}`} />
                              <span className={`truncate text-[12.5px] font-medium leading-tight ${active ? "text-foreground" : "text-foreground group-hover:text-foreground"}`}>
                                {p.title}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 pl-[14px] font-mono text-[9.5px] tabular-nums text-muted-foreground">
                              <span className={active ? "text-primary/80" : ""}>{ui(statusLabel[p.status] ?? p.status)}</span>
                              <span className="text-muted-foreground">·</span>
                              <span>{p.taskCount} task</span>
                              {ago && (
                                <>
                                  <span className="text-muted-foreground">·</span>
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
          className="sticky top-0 z-20 hidden h-[100dvh] w-11 shrink-0 items-start justify-center border-r border-border bg-background pt-5 text-muted-foreground transition hover:text-primary md:flex"
          aria-label={ui("Buka sidebar")}
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
    </>
  );
}
