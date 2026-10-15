"use client";

import { memo } from "react";
import { BaseEdge, Handle, Position, getBezierPath, type EdgeProps } from "@xyflow/react";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
import type { Feature, Task } from "@/lib/types";
import { getProjectIdentity } from "@/lib/project-identity";
import { projectStockIcons } from "@/lib/phase-icons";
import { PhaseIcon, StockIcon } from "./stock-icon";
import styles from "./plan-map.module.css";

export type MapNodeData = {
  kind: "root" | "feature" | "sub-features" | "tasks";
  label: string;
  feature?: Feature;
  items?: { label: string; status?: Task["status"]; ref?: string }[];
  onTaskSelect?: (ref: string) => void;
  onOpen?: () => void;
  total?: number;
  phase?: number;
  done?: number;
  generating?: boolean;
};

function RoadmapNode({ data, selected }: { data: MapNodeData; selected?: boolean }) {
  const language = useUiLanguage();
  const target = <Handle type="target" position={Position.Left} className={styles.handle} />;
  const source = <Handle type="source" position={Position.Right} className={`${styles.handle} ${data.kind === "root" ? styles.rootHandle : ""}`} />;
  const selectedClass = selected ? styles.selected : "";

  if (data.kind === "root") return <div className={`${styles.card} ${styles.root}`} data-map-kind="root">
    {source}
    <div className={styles.titleRow}>
      <StockIcon name={projectStockIcons[getProjectIdentity({ id: data.label, title: data.label }).icon]} size={20} />
      <strong className={styles.title} title={data.label}>{data.label}</strong>
    </div>
    <p className={styles.caption}>{ui("Perencanaan")}</p>
  </div>;

  if (data.kind === "feature") {
    const status = data.feature?.status ?? "direncanakan";
    return <div className={`${styles.card} ${styles.phase} ${selectedClass}`} data-map-kind="feature" data-phase={data.phase}>
      {target}{source}
      <span className={styles.phaseLabel}>{ui("Fase")} {String(data.phase ?? 0).padStart(2, "0")}</span>
      <div className={styles.titleRow}>
        <PhaseIcon phase={data.feature ?? { title: data.label }} size={18} />
        <strong className={styles.title} title={data.label}>{data.label}</strong>
      </div>
      <div className={styles.phaseMeta}>
        <span className={styles.status}><span className={`${styles.statusDot} ${status !== "direncanakan" ? styles.activeDot : ""}`} />{ui({ direncanakan: "Planned", berjalan: "In progress", selesai: "Done" }[status])}</span>
        <span className={styles.counts}>{data.done ?? 0}/{data.total ?? 0}</span>
      </div>
    </div>;
  }

  const taskNode = data.kind === "tasks";
  const items = data.items?.slice(0, 3) ?? [];
  return <div className={`${styles.card} ${styles.list} ${selectedClass}`} data-map-kind={data.kind}>
    {target}{!taskNode && source}
    <div className={styles.listHeader}>
      <span className={styles.listLabel}><StockIcon name={taskNode ? "list-check" : "sitemap"} size={11} />{taskNode ? "Tasks" : ui("Sub fitur")}</span>
      <span className={styles.counts}>{data.done ?? 0}/{data.total ?? 0}</span>
    </div>
    <div className={styles.items}>
      {items.map((item, index) => <button type="button" key={`${item.ref ?? item.label}-${index}`} title={item.label} className={styles.item}
        onClick={taskNode ? event => { event.stopPropagation(); if (item.ref) data.onTaskSelect?.(item.ref); } : undefined}>
        {item.status === "done" ? <StockIcon name="check" size={10} className="text-[#74FA6A]" /> : <span className={`${styles.statusDot} ${item.status === "in_progress" ? styles.activeDot : ""}`} />}
        <span className={`${styles.itemText} ${item.status === "done" ? styles.done : ""}`}>{item.label}</span>
      </button>)}
      {!items.length && <p className={styles.empty}>{data.generating
        ? language === "en" ? "Building tasks…" : "Menyusun tugas…"
        : language === "en" ? "No items yet" : "Belum ada item"}</p>}
    </div>
    <button type="button" className={styles.viewAll} onClick={event => { event.stopPropagation(); data.onOpen?.(); }}>{ui("Lihat semua (")}{data.total ?? 0})</button>
  </div>;
}

const RoadmapEdge = memo(function RoadmapEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 });
  return <BaseEdge path={path} style={{ ...style, strokeWidth: 1.25 }} interactionWidth={12} />;
});

export const roadmapNodeTypes = { mapNode: RoadmapNode };
export const roadmapEdgeTypes = { flow: RoadmapEdge };
