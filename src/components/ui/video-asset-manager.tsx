"use client";

import { useState } from "react";
import {
  ChevronLeft, Search, Bell, Users, LayoutGrid,
  List, Play, Plus, FolderOpen, Link2,
  SlidersHorizontal, ChevronDown,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const ASSETS = [
  { id: 1, file: "DRP_00041_2020FL_V1_0001.mov", creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "0:14", tag: "Rise",     tagColor: "gray",   scene: "neon-night"        },
  { id: 2, file: "DRP_0008_PREVFX_V1_0002.mov",  creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "0:32", tag: "Conflict", tagColor: "yellow", scene: "explosion"         },
  { id: 3, file: "DRP_0008_DTHRIVE_V1_0003.mov", creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:21", tag: "Rise",     tagColor: "gray",   scene: "two-silhouette"    },
  { id: 4, file: "DRP_0008_DTHRIVE_V1_0004.mov", creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:18", tag: "Saved",    tagColor: "gray",   scene: "single-silhouette" },
  { id: 5, file: "DRP_0008_2020FL_V1_0005.mov",  creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "0:09", tag: "Rise",     tagColor: "gray",   scene: "dramatic-face"     },
  { id: 6, file: "DRP_0008_2020FL_V1_0006.mov",  creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "1:00", tag: "Conflict", tagColor: "yellow", scene: "warm-woman"        },
  { id: 7, file: "DRP_0008_2020FL_V1_0007.mov",  creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:47", tag: "Rise",     tagColor: "gray",   scene: "bathtub-blue"      },
  { id: 8, file: "DRP_0008_2020FL_V1_0008.mov",  creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:33", tag: "Conflict", tagColor: "yellow", scene: "warm-indoor"       },
];

// ─── Thumbnail — Unsplash cinematic photos ────────────────────────────────────

const THUMB: Record<string, string> = {
  "neon-night":        "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=440&h=248&fit=crop&q=80",
  "explosion":         "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=440&h=248&fit=crop&q=80",
  "two-silhouette":    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=440&h=248&fit=crop&q=80",
  "single-silhouette": "https://images.unsplash.com/photo-1500099817043-86d46000d58f?w=440&h=248&fit=crop&q=80",
  "dramatic-face":     "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=440&h=248&fit=crop&crop=faces&q=80",
  "warm-woman":        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=440&h=248&fit=crop&crop=faces&q=80",
  "bathtub-blue":      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=440&h=248&fit=crop&q=80",
  "warm-indoor":       "https://images.unsplash.com/photo-1492681290082-e932832941e6?w=440&h=248&fit=crop&q=80",
};

function Thumb({ scene }: { scene: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={THUMB[scene] ?? ""}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 36px rgba(0,0,0,0.65)" }} />
    </div>
  );
}

// ─── Tag Badge ────────────────────────────────────────────────────────────────

function TagBadge({ label, color }: { label: string; color: string }) {
  const styles = color === "yellow"
    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
    : "bg-white/10 text-slate-300 border border-white/10";
  return <span className={`inline-block rounded px-1.5 py-[2px] text-[8px] font-medium ${styles}`}>{label}</span>;
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, selected, onSelect }: {
  asset: typeof ASSETS[0]; selected: boolean; onSelect: () => void;
}) {
  return (
    <div
      className={`cursor-pointer overflow-hidden rounded-lg transition-all duration-150 ${selected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-white/20"}`}
      style={{ background: "#111418" }}
      onClick={onSelect}
    >
      <div className="relative" style={{ height: 110 }}>
        <Thumb scene={asset.scene} />
        <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <Play size={9} className="translate-x-[1px] text-white" fill="white" />
        </div>
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-[2px] text-[9px] font-medium text-white">
          {asset.duration}
        </div>
        {selected && <div className="absolute inset-0 bg-blue-500/10" />}
      </div>
      <div className="px-2.5 py-2 space-y-1.5">
        <p className="truncate text-[9px] font-medium text-slate-200 leading-tight">{asset.file}</p>
        <p className="text-[8px] text-slate-500">{asset.creator} | {asset.date}</p>
        <div className="flex items-center justify-between gap-1">
          <TagBadge label={asset.tag} color={asset.tagColor} />
          <div className="flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-[3px] cursor-pointer">
            <span className="text-[8px] text-slate-400">Select an option</span>
            <ChevronDown size={7} className="text-slate-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

function SideItem({ icon, label, active, badge, badgeColor = "yellow" }: {
  icon?: React.ReactNode; label: string; active?: boolean; badge?: number; badgeColor?: string;
}) {
  return (
    <div className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-[5px] text-[10px] transition-colors ${active ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`ml-1 shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold ${badgeColor === "yellow" ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>{badge}</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoAssetManager() {
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d1117] font-sans text-white select-none" style={{ fontSize: 12 }}>

      {/* ── Sidebar ── */}
      <div className="flex w-[155px] shrink-0 flex-col border-r border-white/[.07] bg-[#090d13] overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div className="px-2 pt-3">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Assets</p>
          <SideItem icon={<FolderOpen size={10} />} label="All Assets" />
          <SideItem label="Episodes" />
          <SideItem label="Key Scenes" active />
          <SideItem label="Teaser" />
          <SideItem label="Location" />
        </div>
        <div className="my-2 mx-2 border-t border-white/[.06]" />
        <div className="px-2">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Collections</p>
          <SideItem label="Needs Re-structuring" />
          <SideItem label="Videos" />
          <SideItem label="Images" />
          <SideItem label="Audio" />
          <SideItem label="Needs Review" badge={9} />
          <SideItem label="Approved" />
          <div className="mt-0.5 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plus size={9} /><span>New Collection</span>
          </div>
        </div>
        <div className="my-2 mx-2 border-t border-white/[.06]" />
        <div className="px-2">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Shares</p>
          <SideItem label="All Shares (2)" />
          <SideItem label="Teaser #2" />
          <SideItem label="Teaser v1" />
          <div className="mt-0.5 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plus size={9} /><span>New Share</span>
          </div>
        </div>
        <div className="mt-auto border-t border-white/[.06] px-2 py-2">
          <div className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Link2 size={10} /><span>CSC Connections</span>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top navbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[.07] bg-[#090d13] px-3" style={{ height: 38 }}>
          <div className="flex items-center gap-1.5">
            <ChevronLeft size={13} className="text-slate-500 cursor-pointer hover:text-slate-300" />
            <span className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">Teaser</span>
            <span className="text-[10px] text-slate-600 mx-0.5">|</span>
            <span className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">All Assets</span>
            <span className="text-[10px] text-slate-600 mx-0.5">|</span>
            <span className="text-[10px] font-semibold text-white border-b border-white pb-[1px]">Key Scenes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1">
              <Search size={9} className="text-slate-500" />
              <span className="text-[9px] text-slate-500">Search in Key Scenes</span>
            </div>
            <Users size={13} className="text-slate-500 cursor-pointer hover:text-slate-300" />
            <Bell  size={13} className="text-slate-500 cursor-pointer hover:text-slate-300" />
            <div className="h-[13px] w-[13px] rounded border border-white/20 cursor-pointer" />
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-white">
              CD
              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-400 ring-1 ring-[#090d13]" />
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[.07] bg-[#0d1117] px-3 py-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">10 Assets · <span className="text-slate-500">514.08 GB</span></span>
            <div className="flex items-center gap-0.5">
              {["Appearance", "Fields", "Validate"].map((tab) => (
                <button key={tab} className={`rounded px-2 py-[3px] text-[9px] font-medium transition-colors ${tab === "Appearance" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer hover:text-slate-200">
              <SlidersHorizontal size={9} />
              <span>Sorted by: Date Uploaded</span>
              <ChevronDown size={9} />
            </div>
            <div className="flex items-center gap-0.5 rounded border border-white/10 p-0.5">
              <button onClick={() => setView("grid")} className={`rounded p-1 transition-colors ${view === "grid" ? "bg-white/15 text-white" : "text-slate-500 hover:text-slate-300"}`}><LayoutGrid size={10} /></button>
              <button onClick={() => setView("list")} className={`rounded p-1 transition-colors ${view === "list" ? "bg-white/15 text-white" : "text-slate-500 hover:text-slate-300"}`}><List size={10} /></button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-4 gap-2.5">
            {ASSETS.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selected === asset.id}
                onSelect={() => setSelected(selected === asset.id ? null : asset.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[.07] bg-[#090d13] px-4 py-1.5">
          <span className="text-[10px] text-slate-500">10 items</span>
        </div>
      </div>
    </div>
  );
}
