"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Feature, Plan, Task } from "@/lib/types";
import { PhaseIcon } from "./stock-icon";
import { roadmapNodeTypes, roadmapEdgeTypes, type MapNodeData } from "./roadmap-node";
import { roadmapLayout, roadmapRowPositions } from "@/lib/roadmap-layout";

function FeaturePanel({ plan, index, onClose, onNav, isPro, onDeleteFeature, onDeleteSubFeature }: { plan: Plan; index: number; onClose: () => void; onNav: (direction: number) => void; isPro?: boolean; onDeleteFeature?: (slug: string, title: string) => void; onDeleteSubFeature?: (slug: string, title: string) => void }) {
  useUiLanguage();
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const feature = plan.features[index];

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if ((event.target as Element)?.closest?.("[data-task-panel]")) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onNav(-1);
      if (event.key === "ArrowRight") onNav(1);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNav]);

  if (!feature) return null;
  const tasks = feature.subFeatures.flatMap((subFeature) => subFeature.tasks);
  const done = tasks.filter((task) => task.status === "done").length;
  const statusLabel = ui({ direncanakan: "Planned", berjalan: "In progress", selesai: "Done" }[feature.status]);

  return (
    <motion.aside
      initial={{ x: reducedMotion ? 0 : "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: reducedMotion ? 0 : "-100%", opacity: 0 }}
      transition={{ type: "tween", duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute inset-y-0 left-0 z-20 w-full min-w-0 overflow-x-hidden overflow-y-auto break-words border-r border-white/[.06] bg-[#0C0E10] shadow-xl shadow-black/30 ${expanded ? "sm:w-[600px] sm:max-w-[85vw]" : "sm:w-[430px] sm:max-w-[45vw]"}`}
    >
      <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-white/[.06] bg-[#0C0E10] px-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onNav(-1)} disabled={index === 0} className="grid size-7 place-items-center rounded border border-white/10 text-slate-400 transition hover:border-white/30 hover:text-slate-200 disabled:opacity-30" aria-label={ui("Previous phase")}><ChevronLeft size={14} /></button>
          <span className="min-w-12 text-center text-[11px] text-slate-300">{index + 1} / {plan.features.length}</span>
          <button onClick={() => onNav(1)} disabled={index === plan.features.length - 1} className="grid size-7 place-items-center rounded border border-white/10 text-slate-400 transition hover:border-white/30 hover:text-slate-200 disabled:opacity-30" aria-label={ui("Next phase")}><ChevronRight size={14} /></button>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <button disabled title={ui("Coming soon")} className="grid size-8 place-items-center rounded transition hover:bg-white/5 disabled:opacity-40" aria-label={ui("Revise phase")}><Pencil size={14} /></button>
          <button
            disabled={!isPro}
            onClick={() => isPro && onDeleteFeature?.(feature.slug, feature.title)}
            title={isPro ? ui("Hapus fase ini") : ui("Hapus struktur hanya untuk paket Pro")}
            className="grid size-8 place-items-center rounded transition hover:bg-white/5 hover:text-rose-400 disabled:opacity-40 disabled:hover:text-slate-500"
            aria-label={ui("Hapus fitur")}
          ><Trash2 size={14} /></button>
          <button className="hidden size-8 place-items-center rounded transition hover:bg-white/5 hover:text-slate-200 sm:grid" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={expanded ? ui("Collapse phase panel") : ui("Expand phase panel")}>{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          <button onClick={onClose} className="grid size-8 place-items-center rounded transition hover:bg-white/5 hover:text-slate-200" aria-label={ui("Tutup")}><X size={15} /></button>
        </div>
      </div>
      <div data-feature-panel className="p-4 pb-8">
        <div className="flex items-center gap-2">
          <PhaseIcon phase={feature} size={18} className="shrink-0 text-slate-300" />
          <h2 className="text-sm font-bold text-white">{feature.title}</h2>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-400">{feature.description}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-slate-300">{statusLabel}</span>
          <span className="text-[9px] text-slate-400">{done}/{tasks.length}{ui("tugas selesai")}</span>
        </div>

        <h3 className="mt-5 text-[11px] font-bold text-white">{ui("Tujuan")}</h3>
        <p className="mt-1.5 text-[11px] leading-4 text-slate-200">{feature.tujuan}</p>

        <h3 className="mt-4 text-[11px] font-bold text-white">{ui("Selesai bila")}</h3>
        <ul className="mt-1.5 space-y-1.5">
          {feature.selesaiBila.map((item) => (
            <li key={item} className="flex gap-2 text-[11px] leading-4 text-slate-200">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-slate-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-[11px] font-bold text-white">{ui("Sub fitur")} ({feature.subFeatures.length})</h3>
        <div className="mt-1.5 space-y-1.5">
          {feature.subFeatures.map((subFeature) => {
            const subTasks = subFeature.tasks;
            const subDone = subTasks.filter((task) => task.status === "done").length;
            const subActive = subTasks.some((task) => task.status === "in_progress");
            return (
               <div key={subFeature.title} className={`rounded-lg border bg-[#0C0E10] px-2.5 py-2 ${subActive ? "border-amber-400/30" : "border-white/[.06]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {subActive && <span className="size-1.5 shrink-0 animate-spin rounded-full border border-amber-400 border-r-transparent" />}
                    <span className="truncate text-[10px] font-medium text-slate-200">{subFeature.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[8px] text-slate-500">{subDone}/{subTasks.length}</span>
                    {/* Hapus sub-fitur: Pro only, lewat tombol trash kecil di tiap baris. */}
                    <button
                      disabled={!isPro || subActive}
                      onClick={() => isPro && onDeleteSubFeature?.(feature.slug, subFeature.title)}
                      title={!isPro ? ui("Hapus struktur hanya untuk paket Pro") : subActive ? ui("An agent is working on this subfeature") : ui("Delete subfeature {0}", subFeature.title)}
                      className="grid size-4 place-items-center rounded text-slate-600 transition hover:bg-rose-400/10 hover:text-rose-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600"
                      aria-label={ui("Delete subfeature {0}", subFeature.title)}
                    ><Trash2 size={9} /></button>
                  </span>
                </div>
                {subFeature.tujuan && <p className="mt-1 text-[10px] leading-4 text-slate-400">{subFeature.tujuan}</p>}
              </div>
            );
          })}
        </div>


      </div>
    </motion.aside>
  );
}


function RoadmapTaskPanel({ plan, taskRef, onSelect, onClose }: { plan: Plan; taskRef: string; onSelect: (ref: string) => void; onClose: () => void }) {
  useUiLanguage();
  const reducedMotion = useReducedMotion();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  const [expanded, setExpanded] = useState(false);
  const entry = plan.features.flatMap(feature => feature.subFeatures.flatMap(sub => sub.tasks.map(task => ({ feature, sub, task })))).find(entry => entry.task.ref === taskRef);
  if (!entry) return null;
  const { task, feature, sub } = entry;
  return <motion.aside ref={panel} tabIndex={-1} data-task-panel aria-label={ui("Task details")} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }} initial={{ x: reducedMotion ? 0 : "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: reducedMotion ? 0 : "100%", opacity: 0 }} transition={{ type: "tween", duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }} className={`absolute inset-y-0 right-0 z-30 w-full min-w-0 overflow-x-hidden overflow-y-auto break-words border-l border-white/[.06] bg-[#0C0E10] shadow-xl shadow-black/30 ${expanded ? "sm:w-[600px] sm:max-w-[85vw]" : "sm:w-[430px] sm:max-w-[45vw]"}`}>
    <header className="sticky top-0 flex h-12 items-center justify-between border-b border-white/10 bg-[#0C0E10] px-4">
      <b className="text-xs">{ui("Task details")}</b>
      <div className="flex gap-1"><button className="hidden size-9 place-items-center rounded hover:bg-white/5 sm:grid" aria-label={expanded ? ui("Collapse task panel") : ui("Expand task panel")} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}</button><button className="grid size-9 place-items-center rounded hover:bg-white/5" aria-label={ui("Close task details")} onClick={onClose}><X size={15}/></button></div>
    </header>
    <div className="space-y-5 p-5">
      <p className="font-mono text-xs text-slate-200">{task.ref}</p>
      <h2 className="text-base font-semibold text-white">{task.title}</h2>
      <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 text-xs text-slate-300"><dt>{ui("Status")}</dt><dd>{ui(({ pending: "Belum dimulai", in_progress: "Dikerjakan", done: "Selesai", failed: "Gagal" })[task.status])}</dd><dt>{ui("Layer")}</dt><dd>{task.layer}</dd><dt>{ui("Phase")}</dt><dd>{feature.title}</dd><dt>{ui("Subfeature")}</dt><dd>{sub.title}</dd>{task.page && <><dt>{ui("Page")}</dt><dd>{task.page}</dd></>}</dl>
      <section><h3 className="mb-2 text-xs font-semibold">{ui("Dependencies")}</h3>{task.deps.length ? task.deps.map(ref => <button key={ref} className="mr-2 rounded bg-white/5 px-3 py-2 font-mono text-xs text-slate-200" onClick={() => onSelect(ref)}>{ref}</button>) : <p className="text-xs text-slate-400">{ui("No dependencies")}</p>}</section>
      {(task.lastFailReason || task.failReason) && <p className="text-xs text-rose-300">{task.lastFailReason || task.failReason}</p>}
      <section><h3 className="mb-2 text-xs font-semibold">{ui("Tasks in this subfeature")}</h3><div className="space-y-2">{sub.tasks.map(item => <button key={item.ref} onClick={() => onSelect(item.ref)} aria-pressed={item.ref === taskRef} className={`block w-full whitespace-normal break-words rounded-lg px-3 py-3 text-left text-xs ${item.ref === taskRef ? "bg-white/10 text-slate-200" : "bg-white/5 text-slate-300"}`}>{item.title}</button>)}</div></section>
    </div>
  </motion.aside>;
}

function deriveFeatureStatus(feature: Feature): Feature["status"] {
  const tasks = feature.subFeatures.flatMap((subFeature) => subFeature.tasks);
  if (tasks.length === 0) return feature.status ?? "direncanakan";
  if (tasks.every((task) => task.status === "done")) return "selesai";
  if (tasks.some((task) => task.status === "done" || task.status === "in_progress" || task.status === "failed")) return "berjalan";
  return "direncanakan";
}

export function PlanMap({ plan, liveTasks, isPro, onRemoveStructure }: { plan: Plan; liveTasks?: Record<string, Task["status"]>; isPro?: boolean; onRemoveStructure?: (type: "feature" | "subfeature" | "task", params: Record<string, string>, label: string) => void }) {
  const language = useUiLanguage();
  const [selected, setSelected] = useState<number | null>(null);
  const [taskRef, setTaskRef] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const flow = useRef<ReactFlowInstance<Node<MapNodeData>, Edge> | null>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (width === element.clientWidth && height === element.clientHeight) return;
      width = element.clientWidth;
      height = element.clientHeight;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { void flow.current?.fitView({ padding: 0.12, duration: 0 }); });
    });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  const mergedPlan: Plan = useMemo(() => liveTasks
    ? { ...plan, features: plan.features.map((feature) => ({ ...feature, subFeatures: feature.subFeatures.map((subFeature) => ({ ...subFeature, tasks: subFeature.tasks.map((task) => ({ ...task, status: liveTasks[task.ref] ?? task.status })) })) })) }
    : plan, [plan, liveTasks]);

  // Status fitur diturunkan dari task-nya supaya ikut live (polling), bukan cuma dari field DB.
  const displayPlan: Plan = useMemo(() => ({
    ...mergedPlan,
    features: mergedPlan.features.map((feature) => ({ ...feature, status: deriveFeatureStatus(feature) })),
  }), [mergedPlan]);

  // Stabilkan node: snapshot plan terbaru via ref, dan rebuild HANYA kalau isi
// roadmap berubah. Tanpa ini tiap polling bikin objek node baru -> React Flow
// re-init -> production build bisa stuck visibility:hidden ("muncul lalu hilang").
const structureKey = useMemo(
  () => JSON.stringify({
    f: displayPlan.features.map((f) => ({
      i: f.slug,
      title: f.title,
      icon: f.icon,
      s: f.status,
      sf: f.subFeatures.map((sf) => ({ t: sf.title, k: sf.tasks.map((t) => [t.ref, t.status]) })),
    })),
  }),
  [displayPlan],
);
const { nodes, edges } = useMemo(() => {
    const positions = roadmapRowPositions(displayPlan.features.length);
    const dimensions = ({ width, height }: { width: number; height: number }) => ({ style: { width, height }, initialWidth: width, initialHeight: height });
    const nextNodes: Node<MapNodeData>[] = [{
      id: "root",
      type: "mapNode",
      position: positions.root,
      data: { kind: "root", label: plan.title }, ...dimensions(roadmapLayout.root),
    }];
    const nextEdges: Edge[] = [];

    displayPlan.features.forEach((feature, featureIndex) => {
      const row = positions.rows[featureIndex];
      const tasks = feature.subFeatures.flatMap((subFeature) => subFeature.tasks);
      const done = tasks.filter((task) => task.status === "done").length;
      const isSubDone = (subFeature: Feature["subFeatures"][number]) =>
        subFeature.tasks.length > 0
          ? subFeature.tasks.every((task) => task.status === "done")
          : feature.status === "selesai";
      const isSubActive = (subFeature: Feature["subFeatures"][number]) => subFeature.tasks.some((task) => task.status === "in_progress");
      const subsDone = feature.subFeatures.filter(isSubDone).length;
      const phase = featureIndex + 1;
      const featureId = `feature-${featureIndex}`;
      const subFeatureId = `sub-features-${featureIndex}`;
      const taskId = `tasks-${featureIndex}`;

      nextNodes.push(
        { id: featureId, type: "mapNode", position: row.feature, ...dimensions(roadmapLayout.feature), data: { kind: "feature", label: feature.title, feature, phase, done, total: tasks.length } },
        { id: subFeatureId, type: "mapNode", position: row.subfeatures, ...dimensions(roadmapLayout.subfeatures), data: { kind: "sub-features", label: ui("Sub fitur"), feature, onOpen: () => setSelected(featureIndex), items: feature.subFeatures.map((subFeature) => ({ label: subFeature.title, status: isSubDone(subFeature) ? "done" : isSubActive(subFeature) ? "in_progress" : "pending" })), total: feature.subFeatures.length, done: subsDone } },
        { id: taskId, type: "mapNode", position: row.tasks, ...dimensions(roadmapLayout.tasks), data: { kind: "tasks", label: ui("Tasks"), feature, onOpen: () => setTaskRef(tasks[0]?.ref ?? null), items: tasks.map((task) => ({ label: task.title, status: task.status, ref: task.ref })), onTaskSelect: setTaskRef, total: tasks.length, done, generating: plan.status === "generating" } },
      );
      nextEdges.push(
        { id: `root-${featureId}`, source: "root", target: featureId, type: "flow" },
        { id: `${featureId}-${subFeatureId}`, source: featureId, target: subFeatureId, type: "flow" },
        { id: `${subFeatureId}-${taskId}`, source: subFeatureId, target: taskId, type: "flow" },
      );
    });

    return { nodes: nextNodes, edges: nextEdges };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- structureKey mewakili seluruh dependensi isi; displayPlan sengaja gak masuk deps
}, [structureKey, plan.status, plan.title, language]);

  return (
    <div ref={canvas} className="relative h-[calc(100dvh-113px)] min-h-[360px] overflow-hidden bg-[#14161A] md:h-[calc(100dvh-65px)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={roadmapNodeTypes}
        edgeTypes={roadmapEdgeTypes}
        onInit={instance => { flow.current = instance; }}
        minZoom={0.15}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        onNodeClick={(_, node) => {
          const feature = node.data.feature;
          if (node.data.kind === "tasks") {
            setTaskRef(feature?.subFeatures.flatMap(sub => sub.tasks)[0]?.ref ?? null);
          } else if (feature) setSelected(displayPlan.features.findIndex((candidate) => candidate.slug === feature.slug));
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.35} color="#3B3B3B" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <AnimatePresence>
        {taskRef && <RoadmapTaskPanel key="task-detail" plan={displayPlan} taskRef={taskRef} onSelect={setTaskRef} onClose={() => setTaskRef(null)} />}
        {selected !== null && (
          <FeaturePanel
            plan={displayPlan}
            index={selected}
            onClose={() => setSelected(null)}
            isPro={isPro}
            onDeleteFeature={(slug, title) => {
              onRemoveStructure?.("feature", { slug }, ui('Phase "{0}"', title));
              setSelected(null);
            }}
            onDeleteSubFeature={(slug, title) => {
              onRemoveStructure?.("subfeature", { slug, title }, ui('Subfeature "{0}"', title));
            }}
            onNav={(direction) => setSelected((index) => index === null ? index : Math.max(0, Math.min(displayPlan.features.length - 1, index + direction)))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
