"use client";

import { useMemo } from "react";
import dagre from "dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

type Shape = "rect" | "round" | "diamond" | "circle" | "cylinder";
type Rankdir = "TB" | "LR" | "BT" | "RL";

type FlowNodeData = {
  label: string;
  shape?: Shape;
  fields?: string[];
  rankdir?: Rankdir;
  [key: string]: unknown;
};

type ParsedGraph = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  rankdir: Rankdir;
  kind: "flow" | "erd";
};

const MAX_FIELDS = 8;

/* ---------------- styling per bentuk ---------------- */

const shapeStyles: Record<Shape, { box: string; badge: string; glyph: string; map: string }> = {
  rect: { box: "border-white/10", badge: "text-slate-500", glyph: "▪", map: "#334155" },
  round: { box: "border-emerald-400/30", badge: "text-emerald-400/70", glyph: "●", map: "#10b981" },
  circle: { box: "border-emerald-400/30", badge: "text-emerald-400/70", glyph: "●", map: "#10b981" },
  diamond: { box: "border-amber-400/40", badge: "text-amber-400/80", glyph: "◆", map: "#f59e0b" },
  cylinder: { box: "border-sky-400/40", badge: "text-sky-400/80", glyph: "⛁", map: "#0ea5e9" },
};

function FieldRow({ raw }: { raw: string }) {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return <div className="truncate font-mono text-[9px] leading-4 text-slate-400">{raw}</div>;
  }
  const [type, name, ...rest] = parts;
  const constraint = rest.join(" ");
  return (
    <div className="flex items-baseline gap-1.5 font-mono text-[9px] leading-4">
      <span className="truncate text-slate-200">{name}</span>
      <span className="shrink-0 text-slate-500">{type}</span>
      {constraint && (
        <span
          className={`ml-auto shrink-0 text-[7px] font-bold tracking-wide ${
            constraint.includes("PK")
              ? "text-amber-400/90"
              : constraint.includes("FK")
                ? "text-sky-400/90"
                : "text-slate-600"
          }`}
        >
          {constraint}
        </span>
      )}
    </div>
  );
}

function FlowNode({ data }: { data: FlowNodeData }) {
  const shape = data.shape ?? "rect";
  const s = shapeStyles[shape];
  const fields = data.fields ?? [];
  const visible = fields.slice(0, MAX_FIELDS);
  const hasFields = fields.length > 0;
  const vertical = data.rankdir === "TB" || data.rankdir === "BT";
  const pill = shape === "circle" && !hasFields;

  return (
    <div
      className={`h-full w-full border bg-[#0C0F13] px-3 py-2 shadow-lg shadow-black/40 ${s.box} ${
        pill ? "rounded-full" : "rounded-lg"
      }`}
    >
      {vertical ? (
        <>
          <Handle type="target" position={Position.Top} className="!size-1.5 !border-slate-600 !bg-[#0C0F13]" />
          <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-slate-600 !bg-[#0C0F13]" />
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Left} className="!size-1.5 !border-slate-600 !bg-[#0C0F13]" />
          <Handle type="source" position={Position.Right} className="!size-1.5 !border-slate-600 !bg-[#0C0F13]" />
        </>
      )}
      <div className="flex items-start gap-1.5">
        <span className={`mt-px text-[8px] leading-none ${s.badge}`}>{s.glyph}</span>
        <div className="min-w-0 flex-1 text-center text-[11px] font-semibold leading-tight text-slate-100">
          {data.label}
        </div>
      </div>
      {hasFields && (
        <div className="mt-1.5 space-y-px border-t border-white/[.06] pt-1.5 text-left">
          {visible.map((f, i) => (
            <FieldRow key={i} raw={f} />
          ))}
          {fields.length > MAX_FIELDS && (
            <div className="pt-0.5 text-[8px] text-slate-600">+{fields.length - MAX_FIELDS} kolom lain</div>
          )}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

/* ---------------- parsing mermaid ---------------- */

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}

function parseShapeToken(raw: string | undefined): { label: string; shape: Shape } | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("[[") && t.endsWith("]]")) return { label: stripQuotes(t.slice(2, -2)), shape: "rect" };
  if (t.startsWith("[") && t.endsWith("]")) return { label: stripQuotes(t.slice(1, -1)), shape: "rect" };
  if (t.startsWith("((") && t.endsWith("))")) return { label: stripQuotes(t.slice(2, -2)), shape: "circle" };
  if (t.startsWith("(") && t.endsWith(")")) return { label: stripQuotes(t.slice(1, -1)), shape: "round" };
  if (t.startsWith("{") && t.endsWith("}")) return { label: stripQuotes(t.slice(1, -1)), shape: "diamond" };
  if ((t.startsWith("/") && t.endsWith("/")) || (t.startsWith("\\") && t.endsWith("\\"))) {
    return { label: stripQuotes(t.slice(1, -1)), shape: "cylinder" };
  }
  if (t.startsWith(">") && t.endsWith("]")) return { label: stripQuotes(t.slice(1, -1)), shape: "rect" };
  return null;
}

const TOKEN_RE = String.raw`(\w+)((?:\[\[[^\]\n]*\]\]|\[[^\]\n]*\]|\(\([^)\n]*\)\)|\([^)\n]*\)|\{[^}\n]*\}|>[^\]\n]*\]|\/[^\/\n]*\/|\\[^\\\n]*\\)?)`;
const EDGE_RE = new RegExp(
  `${TOKEN_RE}\\s*(-->|---|-.->|==>|~~~)\\s*(?:\\|([^|\\n]*)\\|)?\\s*${TOKEN_RE}`,
  "g",
);

function parseFlowchart(code: string): ParsedGraph | null {
  if (!/flowchart/i.test(code)) return null;
  const dir = code.match(/flowchart\s+(TD|TB|LR|RL|BT)/i)?.[1]?.toUpperCase() ?? "TB";
  const rankdir: Rankdir = (dir === "LR" || dir === "RL" || dir === "BT" ? dir : "TB") as Rankdir;

  const nodeMap = new Map<string, { label: string; shape: Shape }>();
  const edgeList: { source: string; target: string; label?: string }[] = [];
  const register = (id: string, token: string | undefined) => {
    const parsed = parseShapeToken(token);
    if (parsed && parsed.label) nodeMap.set(id, parsed);
    else if (!nodeMap.has(id)) nodeMap.set(id, { label: id, shape: "rect" });
  };

  for (const raw of code.split("\n")) {
    const line = raw.replace(/%%.*/, "").trim();
    if (!line) continue;
    if (/^(flowchart|graph|subgraph|end|classDef|class|linkStyle|style|click|direction)\b/i.test(line)) continue;

    EDGE_RE.lastIndex = 0;
    let matchedEdge = false;
    let m: RegExpExecArray | null;
    while ((m = EDGE_RE.exec(line)) !== null) {
      matchedEdge = true;
      register(m[1], m[2] || undefined);
      register(m[5], m[6] || undefined);
      edgeList.push({ source: m[1], target: m[5], label: m[4]?.trim() || undefined });
      // rewind supaya chain A --> B --> C ikut ke-parse (B jadi source berikutnya)
      const tail = `${m[5]}${m[6] ?? ""}`;
      EDGE_RE.lastIndex -= tail.length;
    }
    if (matchedEdge) continue;

    const def = line.match(new RegExp(`^${TOKEN_RE}\\s*$`));
    if (def) register(def[1], def[2] || undefined);
  }

  if (nodeMap.size === 0) return null;
  return buildGraph(nodeMap, edgeList, rankdir, "flow");
}

function parseERDiagram(code: string): ParsedGraph | null {
  if (!/erDiagram/i.test(code)) return null;
  const entities = new Map<string, string[]>();
  const relations: { source: string; target: string; label?: string }[] = [];

  let currentEntity: string | null = null;
  for (const raw of code.split("\n")) {
    const line = raw.replace(/%%.*/, "").trim();
    if (!line || /^erDiagram/i.test(line)) continue;

    const entityStart = line.match(/^(\w+)\s*\{/);
    if (entityStart) {
      currentEntity = entityStart[1];
      entities.set(currentEntity, []);
      const remainder = line.slice(entityStart[0].length).replace(/\}\s*$/, "").trim();
      if (remainder) entities.get(currentEntity)!.push(remainder);
      if (line.includes("}")) currentEntity = null;
      continue;
    }

    if (currentEntity) {
      if (line === "}") {
        currentEntity = null;
        continue;
      }
      entities.get(currentEntity)!.push(line.replace(/[{}]/g, "").replace(/"[^"]*"/g, "").trim());
      if (line.includes("}")) currentEntity = null;
      continue;
    }

    const rel = line.match(/^(\w+)\s*([|o}{]{1,2}--[|o}{]{1,2})\s*(\w+)\s*(?::\s*(.+))?/);
    if (rel) {
      relations.push({ source: rel[1], target: rel[3], label: rel[4]?.trim() || undefined });
      if (!entities.has(rel[1])) entities.set(rel[1], []);
      if (!entities.has(rel[3])) entities.set(rel[3], []);
    }
  }

  if (entities.size === 0) return null;
  const nodeMap = new Map<string, { label: string; shape?: Shape; fields?: string[] }>();
  for (const [name, fields] of entities) {
    nodeMap.set(name, { label: name, shape: "cylinder", fields: fields.filter(Boolean) });
  }
  return buildGraph(nodeMap, relations, "LR", "erd");
}

/* ---------------- layout dagre ---------------- */

function estimateSize(data: FlowNodeData): { width: number; height: number } {
  const fields = (data.fields ?? []).slice(0, MAX_FIELDS);
  const longestField = fields.reduce((acc, f) => Math.max(acc, f.length), 0);
  const longest = Math.max(data.label.length, longestField);
  const width = Math.min(250, Math.max(132, Math.round(longest * 6.4) + 40));
  const moreRow = (data.fields?.length ?? 0) > MAX_FIELDS ? 13 : 0;
  const height = 34 + (fields.length ? 10 : 0) + fields.length * 15 + moreRow;
  return { width, height };
}

function buildGraph(
  nodeMap: Map<string, { label: string; shape?: Shape; fields?: string[] }>,
  edgeList: { source: string; target: string; label?: string }[],
  rankdir: Rankdir,
  kind: "flow" | "erd",
): ParsedGraph {
  const nodes: Node<FlowNodeData>[] = Array.from(nodeMap.entries()).map(([id, meta]) => ({
    id,
    type: "flowNode",
    position: { x: 0, y: 0 },
    data: { label: meta.label, shape: meta.shape ?? "rect", fields: meta.fields, rankdir },
  }));

  const accent = kind === "erd" ? "#74FA6A" : "#5b6472";
  const edges: Edge[] = edgeList.map((e, i) => ({
    id: `${kind}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    style: { stroke: accent, strokeWidth: 1.3, opacity: kind === "erd" ? 0.75 : 1 },
    ...(kind === "flow"
      ? { markerEnd: { type: MarkerType.ArrowClosed, color: accent, width: 13, height: 13 } }
      : {}),
    labelStyle: { fill: "#9ca3af", fontSize: 9 },
    labelBgStyle: { fill: "#0A0C0E", fillOpacity: 0.92 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  }));

  // dagre auto-layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, ranksep: 72, nodesep: 42, edgesep: 24, marginx: 24, marginy: 24 });
  for (const n of nodes) {
    const { width, height } = estimateSize(n.data);
    g.setNode(n.id, { width, height });
    n.style = { width: `${width}px`, height: `${height}px` };
    n.measured = { width, height };
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);
  for (const n of nodes) {
    const pos = g.node(n.id);
    if (!pos) continue;
    n.position = { x: pos.x - (n.measured?.width ?? 0) / 2, y: pos.y - (n.measured?.height ?? 0) / 2 };
  }

  return { nodes, edges, rankdir, kind };
}

export function mermaidToFlow(code: string): ParsedGraph | null {
  try {
    return parseFlowchart(code) ?? parseERDiagram(code);
  } catch {
    return null;
  }
}

/* ---------------- komponen utama ---------------- */

export function MermaidFlow({ code }: { code: string }) {
  const graph = useMemo(() => mermaidToFlow(code), [code]);
  if (!graph) return null;

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-xl border border-white/[.06] bg-[#0A0C0E]">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        minZoom={0.2}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1c2430" />
        <Controls showInteractive={false} />
        {graph.nodes.length >= 8 && (
          <MiniMap
            pannable
            zoomable
            className="!bg-[#0C0F13]"
            maskColor="rgba(0,0,0,0.55)"
            nodeColor={(n) => shapeStyles[(n.data as FlowNodeData).shape ?? "rect"].map}
            nodeStrokeColor="transparent"
          />
        )}
      </ReactFlow>
      <div className="pointer-events-none absolute right-2.5 top-2.5 rounded-md border border-white/[.06] bg-black/50 px-2 py-1 text-[8px] uppercase tracking-[.14em] text-white/30">
        {graph.kind === "erd" ? "ER Diagram" : "Flowchart"} · drag node · scroll zoom
      </div>
    </div>
  );
}
