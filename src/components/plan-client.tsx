"use client";

import { useEffect, useState, useCallback, useRef, startTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lightbulb, Map, FileText, ListChecks } from "lucide-react";
import { Shell, Brand } from "@/components/brand";
import { PlanMap } from "@/components/plan-map";
import { AgentPromptModal } from "@/components/agent-modal";
import { IdeaChatPanel } from "@/components/idea-chat";
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
  { key: "struktur", label: "Roadmap", icon: Map },
  { key: "prd", label: "PRD", icon: FileText },
  { key: "task", label: "Tasks", icon: ListChecks },
] as const;

type ViewKey = (typeof viewTabs)[number]["key"];

/** Banner jujur: bagian PRD ini template generik karena LLM gagal saat generate. */
function FallbackWarningBanner({ warnings }: { warnings?: string[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="border-b border-amber-400/20 bg-amber-400/[.06] px-4 py-2 md:px-6">
      <p className="text-[11px] leading-relaxed text-amber-200/90">
        <span className="font-semibold">⚠ Catatan:</span> {warnings.join(" · ")}. Narasi lainnya tetap spesifik untuk project ini.
      </p>
    </div>
  );
}

function ViewTabs({ view, setView, pillId }: { view: ViewKey; setView: (v: ViewKey) => void; pillId: string }) {
  return (
    <div role="tablist" className="flex items-center gap-1 rounded-2xl border border-white/[.08] bg-white/[.03] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      {viewTabs.map((t) => {
        const active = view === t.key;
        const Icon = t.icon;
        return (
          <motion.button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => setView(t.key)}
            whileTap={{ scale: 0.95 }}
            className={`relative flex min-w-[106px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-colors duration-300 ${
              active ? "text-[#07120A]" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-xl bg-[#74FA6A] shadow-[0_2px_16px_rgba(116,250,106,0.35)]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <Icon size={13} className="relative z-10" />
            <span className="relative z-10">{t.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function PlanClient({ plan: initialPlan, tier = "free" }: { plan: Plan; tier?: "free" | "pro" }) {
  const [plan, setPlan] = useState(initialPlan);
  const [liveTasks, setLiveTasks] = useState<Record<string, Task["status"]> | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [view, setView] = useState<"struktur" | "prd" | "task">("struktur");
  const [statusIdx, setStatusIdx] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const lastPollSig = useRef("");
  const generatingTasks = plan.status === "generating";
  const isPro = tier === "pro";

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
        for (const f of data.features) {
          for (const sf of f.subFeatures ?? []) {
            for (const t of sf.tasks ?? []) map[t.ref] = t.status;
          }
        }
        // Skip polling yang isinya identik: tiap setState bikin objek plan baru,
        // dan PlanMap me-recreate node React Flow — node gak perlu di-reinit
        // kalau gak ada yang berubah (ini biang roadmap "muncul lalu hilang").
        // Sig mencakup status + seluruh isi fitur/task, jadi cukup sebagai penanda.
        const sig = JSON.stringify({ s: data.status, f: data.features });
        if (sig === lastPollSig.current) {
          return;
        }
        lastPollSig.current = sig;
        // startTransition: polling bisa resolve pas React Flow lagi render
        // (komponen ForwardRef internal-nya) — tanpa ini muncul console error
        // "Cannot update a component while rendering a different component".
        startTransition(() => {
          setPlan((prev) => {
          const updated = { ...prev, status: data.status ?? prev.status };
          updated.features = updated.features.map((f) => {
            const serverF = data.features?.find((sf: { slug: string }) => sf.slug === f.slug);
            if (!serverF) return f;
            for (const serverSf of serverF.subFeatures ?? []) {
              for (const t of serverSf.tasks ?? []) map[t.ref] = t.status;
            }
            const serverSubs: {
              title: string;
              tujuan?: string;
              selesaiBila?: string[];
              tasks?: Pick<Task, "ref" | "title" | "layer" | "phase" | "page" | "status" | "deps">[];
            }[] = serverF.subFeatures ?? [];
            return {
              ...f,
              subFeatures: [
                // Task baru dari server disuntikkan ke sub-fitur yang sudah ada:
                // inilah yang bikin task terisi satu per satu tanpa refresh.
                ...f.subFeatures.map((sf) => {
                  const serverSf = serverSubs.find((ssf) => ssf.title === sf.title);
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
                // Sub-fitur yang BELUM ada di state lokal (mis. fase "QA &
                // Integrasi" yang disuntikkan server saat semua fitur terisi)
                // ikut ditambahkan, bukan didiamkan sampai user refresh.
                ...serverSubs
                  .filter((ssf) => !f.subFeatures.some((sf) => sf.title === ssf.title))
                  .map((ssf) => ({
                    title: ssf.title,
                    tujuan: ssf.tujuan ?? "",
                    selesaiBila: ssf.selesaiBila ?? [],
                    tasks: (ssf.tasks ?? []).map((t: Task) => ({
                      ref: t.ref, title: t.title, layer: t.layer, phase: t.phase,
                      page: t.page, deps: t.deps ?? [], status: t.status,
                      retryCount: 0, lastFailReason: null, failReason: null,
                      startedAt: null, completedAt: null,
                    })),
                  })),
              ],
            };
          });
          // Fase baru dari server ikut ditambahkan: plan kerangka (asinkron)
          // awalnya kosong, lalu server menyuntikkan struktur lengkap — tanpa
          // ini fase-fasenya tidak pernah muncul sampai user refresh.
          for (const sf of data.features ?? []) {
            if (updated.features.some((f) => f.slug === sf.slug)) continue;
            updated.features.push({
              slug: sf.slug,
              title: sf.title,
              icon: "📦",
              description: sf.title,
              tujuan: sf.title,
              selesaiBila: [],
              status: "direncanakan" as const,
              subFeatures: (sf.subFeatures ?? []).map((ssf: { title: string; tujuan?: string; selesaiBila?: string[]; tasks?: Pick<Task, "ref" | "title" | "layer" | "phase" | "page" | "status" | "deps">[] }) => ({
                title: ssf.title,
                tujuan: ssf.tujuan ?? "",
                selesaiBila: ssf.selesaiBila ?? [],
                tasks: (ssf.tasks ?? []).map((t) => ({
                  ref: t.ref, title: t.title, layer: t.layer, phase: t.phase,
                  page: t.page, deps: t.deps ?? [], status: t.status,
                  retryCount: 0, lastFailReason: null, failReason: null,
                  startedAt: null, completedAt: null,
                })),
              })),
            });
          }
          return updated;
        });
        });
        setLiveTasks(map);
        // Struktur baru datang di plan kerangka asinkron (fase ada, task belum):
        // picu generate-all lagi — di server idempoten lewat registry + skip
        // fitur yang sudah berisi task.
        if (data.status === "generating" && (data.features ?? []).length > 0 && Object.keys(map).length === 0) {
          fetch(`/api/plans/${plan.id}/generate-all${await userQs()}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }).catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }, [plan.id]);

  // Hapus struktur (fitur Pro). Target: fase, sub-fitur, atau task.
  // Server menolak bila plan sedang dikerjakan agent (409) atau Free (403).
  const removeStructure = useCallback(async (type: "feature" | "subfeature" | "task", params: Record<string, string>, label: string) => {
    if (!window.confirm(`Hapus ${label}? Task di dalamnya ikut terhapus.`)) return;
    try {
      const qs = new URLSearchParams({ type, ...params }).toString();
      const res = await fetch(`/api/plans/${plan.id}/structure?${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Gagal menghapus struktur.");
        return;
      }
      setNotice(null);
      // Update optimis lokal, lalu sinkronkan penuh dari server.
      setPlan((prev) => ({
        ...prev,
        features: type === "feature"
          ? prev.features.filter((f) => f.slug !== params.slug)
          : prev.features.map((f) => type === "subfeature"
            ? { ...f, subFeatures: f.subFeatures.filter((sf) => sf.title !== params.title) }
            : { ...f, subFeatures: f.subFeatures.map((sf) => ({ ...sf, tasks: sf.tasks.filter((t) => t.ref !== params.ref) })) }),
      }));
      await refreshPlan();
    } catch {
      setNotice("Gagal menghapus struktur. Coba lagi.");
    }
  }, [plan.id, refreshPlan]);

  useEffect(() => {
    if (plan.status !== "generating") {
      if (plan.status === "implementing" || plan.status === "done") {
        const doRefresh = async () => { await refreshPlan(); };
        doRefresh();
      }
      return;
    }

    let active = true;

    // Generate task sekarang digerakkan SERVER (endpoint generate-all,
    // background process): gak mati walau tab ditutup/refresh — dulu bug
    // "plan bolong cuma sampai fase 2" karena loop fetch di browser mati.
    // Browser tinggal trigger sekali + polling /progress (useEffect bawah).
    const trigger = async () => {
      try {
        const res = await fetch(`/api/plans/${plan.id}/generate-all${await userQs()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json().catch(() => null);
        if (data?.error) {
          console.warn(`[generate-all] error:`, data.error);
        }
      } catch (err) {
        console.warn(`[generate-all] failed:`, err);
      }
    };

    trigger();

    return () => { active = true; };
  }, []);

  useEffect(() => {
    // Polling saat "generating" (task digenerate server-side, browser harus
    // melihat task muncul satu per satu) dan saat plan dikerjakan agent
    // (status task berubah). refreshPlan menyuntikkan task & sub-fitur baru
    // ke state + meng-update status plan; dulu polling ini HANYA meng-update
    // peta status tanpa menambah task, jadi UI kosong sampai user refresh.
    if (plan.status !== "generating" && plan.status !== "implementing" && plan.status !== "done" && plan.status !== "ready") return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      await refreshPlan();
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [plan.id, plan.status, refreshPlan]);

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
            <button
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-[#74FA6A]/40 hover:text-white"
              onClick={() => setShowIdeas((v) => !v)}
              aria-pressed={showIdeas}
              title="Kolom chat ide — fitur Pro, maksimal 2 kali per project"
            >
              <Lightbulb size={13} className={showIdeas ? "text-[#74FA6A]" : undefined} />
              Ide Kamu
            </button>
            <button className="btn min-h-0 px-3.5 py-1.5 text-xs" onClick={() => setShowModal(true)} disabled={generatingTasks}>
              {generatingTasks ? "Menyusun task..." : "Mulai implementasi"}
            </button>
          </div>

          <div className="flex w-full justify-center md:hidden">
            <ViewTabs view={view} setView={setView} pillId="view-pill-mobile" />
          </div>
        </div>
      </div>

      <FallbackWarningBanner warnings={plan.warnings} />
      <AnimatePresence>
        {showIdeas && <IdeaChatPanel planId={plan.id} isPro={isPro} open={showIdeas} onClose={() => setShowIdeas(false)} />}
      </AnimatePresence>
      {notice && (
        <div className="border-b border-rose-400/20 bg-rose-400/[.06] px-4 py-2 md:px-6">
          <p className="text-[11px] leading-relaxed text-rose-200/90">
            <span className="font-semibold">✕</span> {notice}{" "}
            {!isPro && <a href="/pricing" className="underline hover:text-white">Upgrade ke Pro</a>}
          </p>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {view === "struktur" && <PlanMap plan={plan} liveTasks={liveTasks} isPro={isPro} onRemoveStructure={removeStructure} />}
        {view === "prd" && <PrdView plan={plan} />}
        {view === "task" && <TaskBoard plan={plan} liveTasks={liveTasks} isPro={isPro} onRemoveTask={(ref, label) => removeStructure("task", { ref }, label)} />}
      </div>

      {showModal && <AgentPromptModal planId={plan.id} onClose={() => setShowModal(false)} />}
    </Shell>
  );
}
