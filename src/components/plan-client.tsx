"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Shell, Brand } from "@/components/brand";
import { PlanMap } from "@/components/plan-map";
import { AgentPromptModal } from "@/components/agent-modal";
import { TaskBoard } from "@/components/task-board";
import { PrdView } from "@/components/prd-view";
import { ProjectSwitcher } from "@/components/project-switcher";
import type { Plan, Task } from "@/lib/types";
import { getCurrentUser } from "@/lib/current-user";

// Query param identitas fallback (dipakai server hanya di mode dev polos;
// di mode Supabase, session cookie yang menang). Sumber: session Supabase.
async function userQs(): Promise<string> {
  const u = await getCurrentUser();
  return u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
}

const statusMessages = [
  "Parsing sub-fitur dan menentukan layer...",
  "Menyusun dependency graph untuk fitur ini...",
  "Membuat task frontend, backend, dan QA...",
  "Memvalidasi urutan eksekusi task...",
];

const viewTabs = [
  { key: "struktur", label: "Struktur" },
  { key: "prd", label: "PRD" },
  { key: "task", label: "Tasks" },
] as const;

type ViewKey = (typeof viewTabs)[number]["key"];

function ViewTabs({ view, setView, pillId }: { view: ViewKey; setView: (v: ViewKey) => void; pillId: string }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/[.08] bg-[#0C0F0C]/85 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      {viewTabs.map((t) => {
        const active = view === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            aria-pressed={active}
            className={`relative rounded-full px-4 py-1.5 text-[12px] font-semibold tracking-tight transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              active ? "text-[#07120A]" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-[#74FA6A] shadow-[0_0_18px_rgba(116,250,106,0.45),0_2px_10px_rgba(116,250,106,0.28)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PlanClient({ plan: initialPlan }: { plan: Plan }) {
  const [plan, setPlan] = useState(initialPlan);
  const [liveTasks, setLiveTasks] = useState<Record<string, Task["status"]> | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"struktur" | "prd" | "task">("struktur");
  const [statusIdx, setStatusIdx] = useState(0);
  const generatingTasks = plan.status === "generating";

  const taskCount = plan.features.reduce((acc, f) => acc + f.subFeatures.reduce((a, sf) => a + sf.tasks.length, 0), 0);
  const doneCount = liveTasks
    ? Object.values(liveTasks).filter((s) => s === "done").length
    : plan.features.reduce((acc, f) => acc + f.subFeatures.reduce((a, sf) => a + sf.tasks.filter((t) => t.status === "done").length, 0), 0);

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${plan.id}/progress${await userQs()}`);
      const data = await res.json();
      if (data.features) {
        const map: Record<string, Task["status"]> = {};
        setPlan((prev) => {
          const updated = { ...prev, status: data.status ?? prev.status };
          updated.features = updated.features.map((f) => {
            const serverF = data.features?.find((sf: { slug: string }) => sf.slug === f.slug);
            if (!serverF) return f;
            for (const serverSf of serverF.subFeatures ?? []) {
              for (const t of serverSf.tasks ?? []) map[t.ref] = t.status;
            }
            return {
              ...f,
              subFeatures: f.subFeatures.map((sf) => {
                const serverSf = serverF.subFeatures?.find((ssf: { title: string }) => ssf.title === sf.title);
                if (!serverSf) return sf;
                const existingRefs = new Set(sf.tasks.map((t) => t.ref));
                const newTasks = (serverSf.tasks ?? []).filter((t: Task) => !existingRefs.has(t.ref));
                if (newTasks.length === 0) return sf;
                return {
                  ...sf,
                  tasks: [...sf.tasks, ...newTasks.map((t: Task) => ({
                    ref: t.ref, title: t.title, layer: t.layer, phase: t.phase,
                    page: t.page, deps: t.deps ?? [], status: t.status,
                    retryCount: 0, lastFailReason: null, failReason: null,
                    startedAt: null, completedAt: null,
                  }))],
                };
              }),
            };
          });
          return updated;
        });
        setLiveTasks(map);
      }
    } catch { /* ignore */ }
  }, [plan.id, plan.status]);

  useEffect(() => {
    if (plan.status !== "generating") {
      if (plan.status === "implementing" || plan.status === "done") {
        const doRefresh = async () => { await refreshPlan(); };
        doRefresh();
      }
      return;
    }

    let active = true;
    let featureIndex = 0;

    const generateNext = async () => {
      if (!active) return;
      const total = plan.features.length;
      setStatusIdx(0);

      const statusTimer = setInterval(() => setStatusIdx((s) => (s + 1) % statusMessages.length), 2200);

      try {
        const res = await fetch(`/api/plans/${plan.id}/generate-tasks${await userQs()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featureIndex }),
        });
        const data = await res.json();
        if (!active) return;
        clearInterval(statusTimer);

        if (data.error) {
          console.warn(`[generate-tasks] F${featureIndex + 1} error:`, data.error);
        }

        await refreshPlan();
      } catch (err) {
        clearInterval(statusTimer);
        console.warn(`[generate-tasks] F${featureIndex + 1} failed:`, err);
      }

      featureIndex++;

      if (featureIndex < total) {
        setTimeout(generateNext, 400);
      } else {
        setPlan((prev) => ({ ...prev, status: "ready" }));
        refreshPlan();
      }
    };

    generateNext();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (plan.status !== "implementing" && plan.status !== "done" && plan.status !== "ready") return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/plans/${plan.id}/progress${await userQs()}`);
        const data = await res.json();
        if (!active) return;
        const map: Record<string, Task["status"]> = {};
        for (const f of data.features ?? []) {
          for (const sf of f.subFeatures ?? []) {
            for (const t of sf.tasks ?? []) map[t.ref] = t.status;
          }
        }
        setLiveTasks(map);
        if (data.status && data.status !== plan.status) {
          setPlan((prev) => ({ ...prev, status: data.status }));
        }
      } catch { /* ignore */ }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [plan.id, plan.status]);

  return (
    <Shell sidebar={false} brand={false}>
      <div className="border-b border-white/8">
        <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 md:flex-nowrap md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Brand />
            <span className="h-4 w-px shrink-0 bg-white/10" aria-hidden="true" />
            <ProjectSwitcher currentId={plan.id} fallbackTitle={plan.title} />
          </div>

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <ViewTabs view={view} setView={setView} pillId="view-pill-desktop" />
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {taskCount > 0 && (
              <span className="hidden font-mono text-[11px] tabular-nums text-white/30 lg:block">
                {doneCount}/{taskCount} task
              </span>
            )}
            <button className="btn min-h-0 px-3.5 py-1.5 text-xs" onClick={() => setShowModal(true)} disabled={generatingTasks}>
              {generatingTasks ? "Menyusun task..." : "Mulai implementasi"}
            </button>
          </div>

          <div className="flex w-full justify-center md:hidden">
            <ViewTabs view={view} setView={setView} pillId="view-pill-mobile" />
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {view === "struktur" && <PlanMap plan={plan} liveTasks={liveTasks} />}
        {view === "prd" && <PrdView plan={plan} />}
        {view === "task" && <TaskBoard plan={plan} liveTasks={liveTasks} />}
      </div>

      {showModal && <AgentPromptModal planId={plan.id} onClose={() => setShowModal(false)} />}
    </Shell>
  );
}
