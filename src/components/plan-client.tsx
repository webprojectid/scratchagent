"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Shell } from "@/components/brand";
import { PlanMap } from "@/components/plan-map";
import { AgentPromptModal } from "@/components/agent-modal";
import { TaskBoard } from "@/components/task-board";
import { RichContent } from "@/components/mermaid";
import type { Plan, Task } from "@/lib/types";

const statusMessages = [
  "Parsing sub-fitur dan menentukan layer...",
  "Menyusun dependency graph untuk fitur ini...",
  "Membuat task frontend, backend, dan QA...",
  "Memvalidasi urutan eksekusi task...",
];

export function PlanClient({ plan: initialPlan }: { plan: Plan }) {
  const [plan, setPlan] = useState(initialPlan);
  const [liveTasks, setLiveTasks] = useState<Record<string, Task["status"]> | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"struktur" | "prd" | "task">("struktur");
  const [statusIdx, setStatusIdx] = useState(0);
  const generatingTasks = plan.status === "generating";

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${plan.id}/progress`);
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
        const res = await fetch(`/api/plans/${plan.id}/generate-tasks`, {
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
        const res = await fetch(`/api/plans/${plan.id}/progress`);
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
    <Shell>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="grid size-8 place-items-center rounded-[8px] border border-white/10 bg-white/[.03] text-slate-400 transition hover:border-[#74FA6A]/30 hover:text-white" aria-label="Kembali">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-1">
              {(["struktur", "prd", "task"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 text-[11px] tracking-wide capitalize ${view === v ? "border-b-2 border-[#74FA6A] text-[#74FA6A]" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {v === "prd" ? "PRD" : v}
                </button>
              ))}
            </div>
            <h1 className="!mt-1 !text-base !font-medium !leading-snug !tracking-tight text-white/90">{plan.title}</h1>
          </div>
        </div>
        <button className="btn min-h-0 px-3 py-1.5 text-xs" onClick={() => setShowModal(true)} disabled={generatingTasks}>
          {generatingTasks ? "Menyusun task..." : "Mulai Implementasi"}
        </button>
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

function PrdView({ plan }: { plan: Plan }) {
  const faseMap = new Map<number, typeof plan.features>();
  for (const f of plan.features) {
    const phases = f.subFeatures.flatMap((sf) => sf.tasks.map((t) => t.phase));
    const minPhase = phases.length ? Math.min(...phases) : 1;
    if (!faseMap.has(minPhase)) faseMap.set(minPhase, []);
    faseMap.get(minPhase)!.push(f);
  }

  const priorityColor: Record<string, string> = { high: "text-red-400", medium: "text-amber-400", low: "text-slate-400" };

  return (
    <article className="mx-auto max-w-2xl px-6 py-8">
      <p className="eyebrow">Product requirements document</p>
      <h1 className="!mt-2 !text-base !font-semibold !tracking-tight text-white">{plan.title}</h1>

      <div className="mt-6 grid gap-5">
        {/* 1. Overview */}
        <section>
          <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">1. Overview</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{plan.brief}</p>
        </section>

        {/* 2. Requirements */}
        <section className="border-t border-white/8 pt-5">
          <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">2. Requirements</h2>
          {plan.requirements ? (
            <div className="mt-2 space-y-3">
              <div>
                <h3 className="!text-[9px] !font-semibold uppercase tracking-[.12em] text-white/30">Fungsional</h3>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs leading-5 text-slate-400">
                  {plan.requirements.fungsional.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="!text-[9px] !font-semibold uppercase tracking-[.12em] text-white/30">Non-Fungsional</h3>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs leading-5 text-slate-400">
                  {plan.requirements.nonFungsional.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            </div>
          ) : null}
          <div className="mt-3">
            <h3 className="!text-[9px] !font-semibold uppercase tracking-[.12em] text-white/30">Asumsi</h3>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs leading-5 text-slate-400">
              {plan.asumsi.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </section>

        {/* 3. Core Features */}
        <section className="border-t border-white/8 pt-5">
          <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">3. Core Features</h2>
          <div className="mt-2 space-y-4">
            {[...faseMap.keys()].sort((a, b) => a - b).map((fase) => (
              <div key={fase}>
                <h3 className="!text-[9px] !font-semibold uppercase tracking-[.12em] text-[#74FA6A]/60">Fase {fase}</h3>
                <div className="mt-1.5 space-y-3">
                  {faseMap.get(fase)!.map((f) => (
                    <div key={f.slug}>
                      <div className="flex items-center gap-2">
                        <span className="!text-xs !font-medium text-white">{f.title}</span>
                        {f.priority && <span className={`text-[8px] font-bold uppercase ${priorityColor[f.priority]}`}>[{f.priority}]</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{f.description}</p>
                      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                        <div>
                          <h4 className="!text-[8px] !font-semibold uppercase tracking-[.12em] text-white/25">Tujuan</h4>
                          <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{f.tujuan}</p>
                        </div>
                        <div>
                          <h4 className="!text-[8px] !font-semibold uppercase tracking-[.12em] text-white/25">Selesai bila</h4>
                          <ul className="mt-0.5 list-disc pl-4 text-[11px] leading-5 text-slate-400">
                            {f.selesaiBila.map((x) => <li key={x}>{x}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. User Flow */}
        {plan.userFlow?.length ? (
          <section className="border-t border-white/8 pt-5">
            <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">4. User Flow</h2>
            <div className="mt-2 space-y-3">
              {plan.userFlow.map((flow, i) => (
                <div key={i}>
                  <h3 className="!text-[9px] !font-semibold uppercase tracking-[.12em] text-white/30">{flow.title}</h3>
                  <ol className="mt-1 space-y-0.5 text-xs leading-5 text-slate-400">
                    {flow.steps.map((step, si) => <li key={si} className="flex gap-2"><span className="text-white/25">{si + 1}.</span><span>{step}</span></li>)}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* 5. Architecture */}
        {plan.architecture && (
          <section className="border-t border-white/8 pt-5">
            <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">5. Architecture</h2>
            <div className="mt-2 rounded-lg border border-white/[.06] bg-[#0e1218] p-3">
              <RichContent text={plan.architecture} diagramOnly />
            </div>
          </section>
        )}

        {/* 6. Database Schema */}
        {plan.databaseSchema && (
          <section className="border-t border-white/8 pt-5">
            <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">6. Database Schema</h2>
            <div className="mt-2 rounded-lg border border-white/[.06] bg-[#0e1218] p-3">
              <RichContent text={plan.databaseSchema} diagramOnly />
            </div>
          </section>
        )}

        {/* 7. Tech Stack */}
        <section className="border-t border-white/8 pt-5">
          <h2 className="!text-[10px] !font-semibold uppercase tracking-[.12em] text-white/40">7. Tech Stack</h2>
          {plan.techStack?.length ? (
            <ul className="mt-1 space-y-1 text-xs text-slate-400">
              {plan.techStack.map((t) => <li key={t.name}><span className="font-medium text-white/70">{t.name}</span> — {t.desc}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-400">{plan.stack.join(" · ")}</p>
          )}
        </section>
      </div>
    </article>
  );
}
