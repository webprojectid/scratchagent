"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
} from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FolderKanban,
  ListChecks,
  Maximize2,
  Network,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Feature, Plan, Task } from "@/lib/types";

type MapNodeData = {
  kind: "root" | "feature" | "sub-features" | "tasks";
  label: string;
  feature?: Feature;
  items?: { label: string; status?: Task["status"] }[];
  total?: number;
  phase?: number;
  done?: number;
  generating?: boolean;
};

function MapNode({ data }: { data: MapNodeData }) {
  // Bahasa visual peta versi Scratch Agent sendiri (sengaja menjauh dari
  // referensi awal): rel status di sisi kiri kartu (hijau=selesai, amber=berjalan,
  // abu=belum), angka fase besar transparan di pojok, dan trail cahaya di garis.
  if (data.kind === "root") {
    return (
      <div className="relative w-56 overflow-hidden rounded-2xl border border-white/[.08] bg-[#1C2330] p-4 pl-5 shadow-lg shadow-black/30">
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[#74FA6A]" />
        <Handle type="source" position={Position.Right} className="!size-2.5 !border-2 !border-[#14161A] !bg-[#74FA6A]" />
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#74FA6A]/12 text-[#74FA6A]">
            <Network size={15} />
          </span>
          <b className="text-[13px] leading-tight text-slate-50">{data.label}</b>
        </div>
        <p className="mt-2 text-[10px] font-medium text-slate-500">Perencanaan</p>
      </div>
    );
  }

  if (data.kind === "feature") {
    const pct = data.total ? Math.round(((data.done ?? 0) / data.total) * 100) : 0;
    const status = data.feature?.status ?? "direncanakan";
    const rail = status === "selesai" ? "bg-[#74FA6A]" : status === "berjalan" ? "bg-amber-400" : "bg-white/20";
    return (
      <div className="relative w-60 cursor-pointer overflow-hidden rounded-2xl border border-white/[.08] bg-[#1C2330] p-3.5 pl-4 shadow-lg shadow-black/30 transition hover:border-[#74FA6A]/40">
        <span className={`absolute inset-y-2 left-0 w-[3px] rounded-full ${rail}`} />
        <span className="pointer-events-none absolute right-2.5 top-1.5 select-none font-mono text-[28px] font-bold leading-none text-white/[.05]">
          {String(data.phase ?? 0).padStart(2, "0")}
        </span>
        <Handle type="target" position={Position.Left} className="!size-2 !border-2 !border-[#14161A] !bg-slate-500" />
        <Handle type="source" position={Position.Right} className="!size-2 !border-2 !border-[#14161A] !bg-slate-500" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/[.05] text-slate-400">
            <FolderKanban size={12} />
          </span>
          <b className="truncate text-[12px] leading-snug text-slate-100">{data.label}</b>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
          <span className="capitalize">{status}</span>
          <span className="font-mono tabular-nums">{data.done}/{data.total}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.06]">
          <div className="h-full rounded-full bg-[#74FA6A]/70 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  const taskNode = data.kind === "tasks";
  return (
    <div className="w-56 cursor-pointer rounded-2xl border border-white/[.08] bg-[#1C2330] p-3 shadow-lg shadow-black/30 transition hover:border-white/[.16]">
      <Handle type="target" position={Position.Left} className="!size-2 !border-2 !border-[#14161A] !bg-slate-600" />
      {!taskNode && <Handle type="source" position={Position.Right} className="!size-2 !border-2 !border-[#14161A] !bg-slate-600" />}
      <div className="mb-2 flex items-center justify-between text-[9px] font-semibold tracking-wide text-slate-500">
        <span className="flex items-center gap-1"><ListChecks size={10} />{taskNode ? "TASKS" : "SUB FITUR"}</span>
        <span className="font-mono tabular-nums">{data.done ?? 0}/{data.total ?? 0}</span>
      </div>
      {taskNode && (!data.items || data.items.length === 0) && data.generating ? (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-white/[.05] bg-white/[.02] px-2 py-1">
              <div className="size-1.5 animate-pulse rounded-full bg-white/20" />
              <div className="h-1.5 w-20 animate-pulse rounded bg-white/10" />
            </div>
          ))}
          <p className="pt-0.5 text-center text-[9px] text-slate-500">Menyusun...</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.items?.slice(0, 3).map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/[.05] bg-white/[.02] px-2 py-1">
              {item.status === "done" ? <Check size={9} className="shrink-0 text-emerald-400" /> : item.status === "in_progress" ? <span className="size-1.5 shrink-0 animate-spin rounded-full border border-amber-400 border-r-transparent" /> : taskNode ? <Circle size={7} className="shrink-0 text-slate-600" /> : <span className="size-1 shrink-0 rounded-full bg-slate-600" />}
              <span className={`truncate text-[10px] ${item.status === "done" ? "text-slate-600 line-through" : "text-slate-300"}`}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1.5 text-right text-[9px] text-slate-500">
        Lihat semua ({data.total ?? 0})
      </div>
    </div>
  );
}

const nodeTypes = { mapNode: MapNode };

// Light trail pada konektor: segmen cahaya putih->hijau meluncur dari judul ke
// tasks, looping. Animasi CSS murni (stroke-dashoffset, GPU) + pathLength={100}
// supaya trail selalu menyapu penuh apa pun panjang garisnya. Delay tiap edge
// dibedakan dari hash id biar ngalir organik, tidak serempak.
const TRAIL_CSS = `
@keyframes scratchTrail {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -100; }
}
.edge-trail { animation: scratchTrail 1.3s linear infinite; }`;

const AnimatedFlowEdge = memo(function AnimatedFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
}: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const gradId = `trail-grad-${id}`;
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  const delay = (-(hash / 1000) * 1.3).toFixed(2);
  const gradient = `url(#${gradId})`;
  const dash = "10 90";
  return (
    <>
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#74FA6A" />
        </linearGradient>
      </defs>
      <BaseEdge path={path} style={style} />
      {/* glow lebar transparan di bawah trail inti, murah tanpa filter blur */}
      <path
        d={path}
        pathLength={100}
        fill="none"
        stroke={gradient}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeDasharray={dash}
        opacity={0.3}
        className="edge-trail"
        style={{ animationDelay: `${delay}s` }}
      />
      <path
        d={path}
        pathLength={100}
        fill="none"
        stroke={gradient}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeDasharray={dash}
        className="edge-trail"
        style={{ animationDelay: `${delay}s` }}
      />
    </>
  );
});

const edgeTypes = { flow: AnimatedFlowEdge };

function FeaturePanel({ plan, index, onClose, onNav, isPro, onDeleteFeature, onDeleteSubFeature }: { plan: Plan; index: number; onClose: () => void; onNav: (direction: number) => void; isPro?: boolean; onDeleteFeature?: (slug: string, title: string) => void; onDeleteSubFeature?: (slug: string, title: string) => void }) {
  const feature = plan.features[index];

  useEffect(() => {
    function handler(event: KeyboardEvent) {
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
  const statusLabel = feature.status.charAt(0).toUpperCase() + feature.status.slice(1);

  return (
    <motion.aside
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "spring", damping: 28 }}
      className="absolute inset-y-0 left-0 z-20 w-full overflow-auto border-r border-white/[.06] bg-[#0C0E10] shadow-xl shadow-black/30 sm:w-[390px]"
    >
      <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-white/[.06] bg-[#0C0E10] px-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onNav(-1)} disabled={index === 0} className="grid size-7 place-items-center rounded border border-white/10 text-slate-400 transition hover:border-[#74FA6A]/60 hover:text-[#74FA6A] disabled:opacity-30" aria-label="Fitur sebelumnya"><ChevronLeft size={14} /></button>
          <span className="min-w-12 text-center text-[11px] text-slate-300">{index + 1} / {plan.features.length}</span>
          <button onClick={() => onNav(1)} disabled={index === plan.features.length - 1} className="grid size-7 place-items-center rounded border border-white/10 text-slate-400 transition hover:border-[#74FA6A]/60 hover:text-[#74FA6A] disabled:opacity-30" aria-label="Fitur berikutnya"><ChevronRight size={14} /></button>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <button disabled title="Segera" className="grid size-8 place-items-center rounded transition hover:bg-white/5 disabled:opacity-40" aria-label="Revisi fitur"><Pencil size={14} /></button>
          <button
            disabled={!isPro}
            onClick={() => isPro && onDeleteFeature?.(feature.slug, feature.title)}
            title={isPro ? "Hapus fase ini" : "Hapus struktur hanya untuk paket Pro"}
            className="grid size-8 place-items-center rounded transition hover:bg-white/5 hover:text-rose-400 disabled:opacity-40 disabled:hover:text-slate-500"
            aria-label="Hapus fitur"
          ><Trash2 size={14} /></button>
          <button title="Perbesar panel" className="grid size-8 place-items-center rounded transition hover:bg-white/5 hover:text-[#74FA6A]" onClick={() => document.querySelector('[data-feature-panel]')?.classList.toggle('sm:w-[560px]')} aria-label="Perbesar panel"><Maximize2 size={14} /></button>
          <button onClick={onClose} className="grid size-8 place-items-center rounded transition hover:bg-white/5 hover:text-[#74FA6A]" aria-label="Tutup"><X size={15} /></button>
        </div>
      </div>
      <div data-feature-panel className="p-4 transition-[width]">
        <div className="flex items-center gap-2">
          <Search size={15} className="shrink-0 text-slate-300" />
          <h2 className="text-sm font-bold text-white">{feature.title}</h2>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-400">{feature.description}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-slate-300">{statusLabel}</span>
          <span className="text-[9px] text-slate-400">{done}/{tasks.length} tugas selesai</span>
        </div>

        <h3 className="mt-5 text-[11px] font-bold text-white">Tujuan</h3>
        <p className="mt-1.5 text-[11px] leading-4 text-slate-200">{feature.tujuan}</p>

        <h3 className="mt-4 text-[11px] font-bold text-white">Selesai bila</h3>
        <ul className="mt-1.5 space-y-1.5">
          {feature.selesaiBila.map((item) => (
            <li key={item} className="flex gap-2 text-[11px] leading-4 text-slate-200">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-slate-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-[11px] font-bold text-white">Sub fitur ({feature.subFeatures.length})</h3>
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
                      title={!isPro ? "Hapus struktur hanya untuk paket Pro" : subActive ? "Sub-fitur sedang dikerjakan agent" : `Hapus sub-fitur "${subFeature.title}"`}
                      className="grid size-4 place-items-center rounded text-slate-600 transition hover:bg-rose-400/10 hover:text-rose-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600"
                      aria-label={`Hapus sub-fitur ${subFeature.title}`}
                    ><Trash2 size={9} /></button>
                  </span>
                </div>
                {subTasks.length > 0 && <p className="mt-0.5 truncate text-[8px] text-slate-500">{subTasks[0].title}</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-white/[.06] bg-[#0C0E10] p-2.5">
          <div className="flex items-center justify-between">
            <b className="text-[10px] text-slate-200">Task ({tasks.length})</b>
          </div>
          <div className="mt-2 space-y-1.5">
            {tasks.slice(0, 2).map((task) => (
              <div key={task.ref} className="flex items-center gap-1.5 text-[9px]">
                {task.status === "done" ? <Check size={9} className="shrink-0 text-emerald-400" /> : task.status === "in_progress" ? <span className="size-2 shrink-0 animate-spin rounded-full border border-amber-400 border-r-transparent" /> : <Circle size={8} className="shrink-0 text-slate-500" />}
                <span className={`min-w-0 flex-1 truncate ${task.status === "done" ? "line-through text-slate-500" : "text-slate-200"}`}>{task.title}</span>
                <span className={`shrink-0 ${task.status === "in_progress" ? "text-amber-400" : "text-slate-500"}`}>{task.status === "done" ? "Selesai" : task.status === "in_progress" ? "Sedang" : task.status === "failed" ? "Gagal" : "Belum"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function deriveFeatureStatus(feature: Feature): Feature["status"] {
  const tasks = feature.subFeatures.flatMap((subFeature) => subFeature.tasks);
  if (tasks.length === 0) return feature.status ?? "direncanakan";
  if (tasks.every((task) => task.status === "done")) return "selesai";
  if (tasks.some((task) => task.status === "done" || task.status === "in_progress" || task.status === "failed")) return "berjalan";
  return "direncanakan";
}

export function PlanMap({ plan, liveTasks, isPro, onRemoveStructure }: { plan: Plan; liveTasks?: Record<string, Task["status"]>; isPro?: boolean; onRemoveStructure?: (type: "feature" | "subfeature" | "task", params: Record<string, string>, label: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const mergedPlan: Plan = useMemo(() => liveTasks
    ? { ...plan, features: plan.features.map((feature) => ({ ...feature, subFeatures: feature.subFeatures.map((subFeature) => ({ ...subFeature, tasks: subFeature.tasks.map((task) => ({ ...task, status: liveTasks[task.ref] ?? task.status })) })) })) }
    : plan, [plan, liveTasks]);

  // Status fitur diturunkan dari task-nya supaya ikut live (polling), bukan cuma dari field DB.
  const displayPlan: Plan = useMemo(() => ({
    ...mergedPlan,
    features: mergedPlan.features.map((feature) => ({ ...feature, status: deriveFeatureStatus(feature) })),
  }), [mergedPlan]);

  const { nodes, edges } = useMemo(() => {
    const rowGap = 230;
    const top = 40;
    const nextNodes: Node<MapNodeData>[] = [{
      id: "root",
      type: "mapNode",
      position: { x: 0, y: top + ((mergedPlan.features.length - 1) * rowGap) / 2 },
      data: { kind: "root", label: plan.title },
    }];
    const nextEdges: Edge[] = [];

    displayPlan.features.forEach((feature, featureIndex) => {
      const y = top + featureIndex * rowGap;
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
        { id: featureId, type: "mapNode", position: { x: 440, y }, data: { kind: "feature", label: feature.title, feature, phase, done, total: tasks.length } },
        { id: subFeatureId, type: "mapNode", position: { x: 880, y: y - 8 }, data: { kind: "sub-features", label: "Sub fitur", feature, items: feature.subFeatures.map((subFeature) => ({ label: subFeature.title, status: isSubDone(subFeature) ? "done" : isSubActive(subFeature) ? "in_progress" : "pending" })), total: feature.subFeatures.length, done: subsDone } },
        { id: taskId, type: "mapNode", position: { x: 1280, y: y - 8 }, data: { kind: "tasks", label: "Tasks", feature, items: tasks.map((task) => ({ label: task.title, status: task.status })), total: tasks.length, done, generating: plan.status === "generating" } },
      );
      // Gaya konektor mengikuti referensi user: kelengkungan bezier (bukan siku
      // smoothstep yang kaku). Root -> fase garis halus penuh; lanjutan antar
      // kolom putus-putus titik-titik, jadi terbaca sebagai "aliran rencana".
      nextEdges.push(
        { id: `root-${featureId}`, source: "root", target: featureId, type: "flow", style: { stroke: "#6b7280", strokeWidth: 1.8 } },
        { id: `${featureId}-${subFeatureId}`, source: featureId, target: subFeatureId, type: "flow", style: { stroke: "#7b8595", strokeWidth: 2.2, strokeDasharray: "0.1 7", strokeLinecap: "round" } },
        { id: `${subFeatureId}-${taskId}`, source: subFeatureId, target: taskId, type: "flow", style: { stroke: "#7b8595", strokeWidth: 2.2, strokeDasharray: "0.1 7", strokeLinecap: "round" } },
      );
    });

    return { nodes: nextNodes, edges: nextEdges };
  }, [displayPlan, plan.status, plan.title]);

  return (
    <div className="relative h-[calc(100vh-150px)] min-h-[620px] bg-[#14161A]">
      <style>{TRAIL_CSS}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.25}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        onNodeClick={(_, node) => {
          const feature = node.data.feature;
          if (feature) setSelected(displayPlan.features.findIndex((candidate) => candidate.slug === feature.slug));
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#282C33" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <AnimatePresence>
        {selected !== null && (
          <FeaturePanel
            plan={displayPlan}
            index={selected}
            onClose={() => setSelected(null)}
            isPro={isPro}
            onDeleteFeature={(slug, title) => {
              onRemoveStructure?.("feature", { slug }, `fase "${title}"`);
              setSelected(null);
            }}
            onDeleteSubFeature={(slug, title) => {
              onRemoveStructure?.("subfeature", { slug, title }, `sub-fitur "${title}"`);
            }}
            onNav={(direction) => setSelected((index) => index === null ? index : Math.max(0, Math.min(displayPlan.features.length - 1, index + direction)))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
