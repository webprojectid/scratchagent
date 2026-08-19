"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Search, Bell, Users, LayoutGrid,
  List, Play, Plus, FolderOpen, Link2, MoreHorizontal,
  SlidersHorizontal, ChevronDown,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const ASSETS = [
  { id: 1, file: "DRP_00041_2020FL_V1_0001.mov", creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "0:14", tag: "Rise",     tagColor: "gray",   scene: "neon-night"   },
  { id: 2, file: "DRP_0008_PREVFX_V1_0002.mov",  creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "0:32", tag: "Conflict", tagColor: "yellow", scene: "explosion"    },
  { id: 3, file: "DRP_0008_DTHRIVE_V1_0003.mov", creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:21", tag: "Rise",     tagColor: "gray",   scene: "two-silhouette" },
  { id: 4, file: "DRP_0008_DTHRIVE_V1_0004.mov", creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:18", tag: "Saved",    tagColor: "gray",   scene: "single-silhouette" },
  { id: 5, file: "DRP_0008_2020FL_V1_0005.mov",  creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "0:09", tag: "Rise",     tagColor: "gray",   scene: "dramatic-face" },
  { id: 6, file: "DRP_0008_2020FL_V1_0006.mov",  creator: "Alistair Martin", date: "Oct 14th, 2024", duration: "1:00", tag: "Conflict", tagColor: "yellow", scene: "warm-woman"   },
  { id: 7, file: "DRP_0008_2020FL_V1_0007.mov",  creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:47", tag: "Rise",     tagColor: "gray",   scene: "bathtub-blue" },
  { id: 8, file: "DRP_0008_2020FL_V1_0008.mov",  creator: "Alistair Martin", date: "Oct 18th, 2024", duration: "0:33", tag: "Conflict", tagColor: "yellow", scene: "warm-indoor"  },
];

// ─── SVG Scene Thumbnails ─────────────────────────────────────────────────────

function Thumb({ scene }: { scene: string }) {
  if (scene === "neon-night") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#060810"/>
      {/* neon glow bg */}
      <ellipse cx="110" cy="80" rx="90" ry="55" fill="#7c3aed" opacity="0.18"/>
      <ellipse cx="60" cy="90" rx="50" ry="30" fill="#06b6d4" opacity="0.12"/>
      {/* buildings */}
      <rect x="0" y="40" width="28" height="84" fill="#0d1117"/>
      <rect x="30" y="25" width="22" height="99" fill="#0a0e15"/>
      <rect x="170" y="30" width="25" height="94" fill="#0d1117"/>
      <rect x="197" y="50" width="23" height="74" fill="#0a0e15"/>
      {/* neon signs */}
      <rect x="8" y="55" width="12" height="3" rx="1" fill="#f0abfc" opacity="0.9"/>
      <rect x="8" y="65" width="8"  height="3" rx="1" fill="#67e8f9" opacity="0.8"/>
      <rect x="175" y="45" width="10" height="3" rx="1" fill="#a78bfa" opacity="0.9"/>
      <rect x="175" y="55" width="14" height="3" rx="1" fill="#f0abfc" opacity="0.7"/>
      {/* street */}
      <rect y="100" width="220" height="24" fill="#080b10"/>
      {/* person silhouette */}
      <ellipse cx="110" cy="78" rx="8" ry="8" fill="#050709"/>
      <path d="M102 86 Q110 84 118 86 L120 110 L100 110 Z" fill="#050709"/>
      {/* ground neon reflection */}
      <ellipse cx="110" cy="112" rx="25" ry="5" fill="#7c3aed" opacity="0.15"/>
      <ellipse cx="110" cy="112" rx="15" ry="3" fill="#06b6d4" opacity="0.12"/>
    </svg>
  );

  if (scene === "explosion") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#0c0500"/>
      <defs>
        <radialGradient id="expbg" cx="50%" cy="45%">
          <stop offset="0%"  stopColor="#fde68a" stopOpacity="0.9"/>
          <stop offset="25%" stopColor="#f97316" stopOpacity="0.8"/>
          <stop offset="55%" stopColor="#dc2626" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#0c0500" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="55" rx="90" ry="75" fill="url(#expbg)"/>
      {/* burst rays */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i)=>(
        <line key={i}
          x1="110" y1="55"
          x2={110+85*Math.cos(deg*Math.PI/180)}
          y2={55+85*Math.sin(deg*Math.PI/180)}
          stroke="#fde68a" strokeWidth="1.5" opacity="0.2"/>
      ))}
      {/* core bright */}
      <ellipse cx="110" cy="55" rx="28" ry="28" fill="#fef3c7" opacity="0.9"/>
      <ellipse cx="110" cy="55" rx="14" ry="14" fill="#fff" opacity="1"/>
      {/* debris particles */}
      {[[80,30],[140,25],[75,70],[148,65],[95,20],[125,18],[60,50],[165,48]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2.5" fill="#fbbf24" opacity="0.7"/>
      ))}
    </svg>
  );

  if (scene === "two-silhouette") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#04060e"/>
      {/* backlight window */}
      <defs>
        <radialGradient id="backwin" cx="50%" cy="40%">
          <stop offset="0%"  stopColor="#e0e7ff" stopOpacity="0.85"/>
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#04060e" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="60" y="8" width="100" height="90" rx="2" fill="#1e1b4b" opacity="0.5"/>
      <ellipse cx="110" cy="52" rx="65" ry="55" fill="url(#backwin)"/>
      {/* person left */}
      <ellipse cx="88" cy="58" rx="10" ry="10" fill="#010204"/>
      <path d="M78 68 Q88 65 98 68 L100 110 L76 110 Z" fill="#010204"/>
      <path d="M78 72 L62 88" stroke="#010204" strokeWidth="8" strokeLinecap="round"/>
      {/* person right */}
      <ellipse cx="132" cy="56" rx="9"  ry="9"  fill="#010204"/>
      <path d="M123 65 Q132 62 141 65 L143 110 L121 110 Z" fill="#010204"/>
      <path d="M141 70 L156 84" stroke="#010204" strokeWidth="7" strokeLinecap="round"/>
      {/* rim light */}
      <path d="M98 66 Q96 80 97 100" stroke="#818cf8" strokeWidth="1.5" opacity="0.4"/>
      <path d="M123 63 Q125 78 124 100" stroke="#818cf8" strokeWidth="1.5" opacity="0.4"/>
      <ellipse cx="110" cy="112" rx="40" ry="5" fill="#818cf8" opacity="0.08"/>
    </svg>
  );

  if (scene === "single-silhouette") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#030508"/>
      <defs>
        <radialGradient id="singback" cx="50%" cy="42%">
          <stop offset="0%"  stopColor="#f0f4ff" stopOpacity="0.9"/>
          <stop offset="35%" stopColor="#93c5fd" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#030508" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="52" rx="75" ry="62" fill="url(#singback)"/>
      {/* door arch */}
      <path d="M70 12 Q110 0 150 12 L150 110 L70 110 Z" fill="#0d1020" opacity="0.3"/>
      {/* single person */}
      <ellipse cx="110" cy="52" rx="11" ry="11" fill="#010203"/>
      <path d="M99 63 Q110 60 121 63 L123 110 L97 110 Z" fill="#010203"/>
      <path d="M99 68 L80 86" stroke="#010203" strokeWidth="9" strokeLinecap="round"/>
      <path d="M121 68 L140 82" stroke="#010203" strokeWidth="8" strokeLinecap="round"/>
      {/* glow floor */}
      <ellipse cx="110" cy="113" rx="32" ry="6" fill="#93c5fd" opacity="0.12"/>
    </svg>
  );

  if (scene === "dramatic-face") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#040302"/>
      {/* single narrow key light strip from left */}
      <defs>
        <linearGradient id="keystrip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#fff8f0" stopOpacity="0.22"/>
          <stop offset="40%" stopColor="#fff8f0" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#fff8f0" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="220" height="124" fill="url(#keystrip)"/>
      {/* neck */}
      <rect x="96" y="88" width="28" height="28" rx="4" fill="#1a120a"/>
      {/* head */}
      <ellipse cx="110" cy="60" rx="32" ry="34" fill="#120d08"/>
      {/* lit left half */}
      <path d="M110 26 Q80 26 78 60 Q78 94 110 94 Z" fill="#2e2014" opacity="0.85"/>
      {/* eye socket left */}
      <ellipse cx="96" cy="55" rx="10" ry="6" fill="#0e0a05"/>
      {/* eye */}
      <ellipse cx="96" cy="55" rx="5"  ry="4"  fill="#1a1208"/>
      <circle  cx="93" cy="53" r="2.5" fill="#f5ede0" opacity="0.9"/>
      {/* brow */}
      <path d="M86 48 Q96 44 106 47" stroke="#1e1710" strokeWidth="2.5" fill="none"/>
      {/* nose */}
      <path d="M104 58 Q106 68 103 74" stroke="#3a2a18" strokeWidth="2.5" fill="none"/>
      {/* lips */}
      <path d="M94 80 Q104 84 114 80" stroke="#3a2010" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* hair */}
      <path d="M78 56 Q80 22 110 22 Q140 22 142 56" fill="#050302"/>
      {/* shoulder */}
      <path d="M55 124 Q75 98 110 96 Q145 98 165 124Z" fill="#0a0804"/>
    </svg>
  );

  if (scene === "warm-woman") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#160600"/>
      <defs>
        <radialGradient id="warmkey" cx="72%" cy="30%">
          <stop offset="0%"  stopColor="#fb923c" stopOpacity="0.75"/>
          <stop offset="60%" stopColor="#dc2626" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#160600" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="158" cy="38" rx="85" ry="70" fill="url(#warmkey)"/>
      {/* neck */}
      <rect x="96" y="86" width="26" height="28" rx="3" fill="#4a1e08"/>
      {/* head */}
      <ellipse cx="110" cy="58" rx="30" ry="32" fill="#5a2810"/>
      {/* hair long */}
      <path d="M80 54 Q78 20 110 20 Q142 20 140 54 Q145 80 142 100 L78 100 Q75 80 80 54Z" fill="#1a0802"/>
      {/* ear */}
      <ellipse cx="80" cy="60" rx="6" ry="9"  fill="#4a2010"/>
      {/* earring */}
      <circle cx="80" cy="72" r="2" fill="#f97316" opacity="0.8"/>
      {/* eye left */}
      <ellipse cx="99" cy="54" rx="9" ry="5"  fill="#3a1808"/>
      <ellipse cx="99" cy="54" rx="5" ry="3.5" fill="#1a0c04"/>
      <circle  cx="97" cy="52" r="2" fill="#fed7aa" opacity="0.8"/>
      {/* eye right (partial) */}
      <ellipse cx="121" cy="53" rx="7"  ry="4"  fill="#3a1808"/>
      {/* nose */}
      <path d="M106 58 Q108 66 106 72" stroke="#6a3018" strokeWidth="2" fill="none"/>
      {/* lips */}
      <path d="M96 80 Q108 85 120 80" stroke="#92280a" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* rim light warm */}
      <path d="M138 28 Q148 58 136 92" stroke="#fb923c" strokeWidth="5" opacity="0.5" fill="none" strokeLinecap="round"/>
      {/* shoulder */}
      <path d="M50 124 Q72 96 110 94 Q148 96 172 124Z" fill="#2d1005"/>
    </svg>
  );

  if (scene === "bathtub-blue") return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#030d18"/>
      {/* tub rim */}
      <rect x="15" y="70" width="190" height="54" rx="6" fill="#051828"/>
      <rect x="20" y="66" width="180" height="12" rx="4" fill="#083248"/>
      {/* underwater glow */}
      <defs>
        <radialGradient id="tubglow" cx="50%" cy="100%">
          <stop offset="0%"  stopColor="#38bdf8" stopOpacity="0.85"/>
          <stop offset="55%" stopColor="#0ea5e9" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#030d18" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="124" rx="80" ry="50" fill="url(#tubglow)"/>
      {/* water surface */}
      <path d="M20 75 Q50 71 80 75 Q110 79 140 75 Q170 71 200 75 L200 82 L20 82Z" fill="#0ea5e9" opacity="0.18"/>
      {/* person — upper body above tub */}
      <rect x="88" y="42" width="44" height="32" rx="6" fill="#0d2a3a"/>
      {/* head */}
      <ellipse cx="110" cy="34" rx="18" ry="19" fill="#1a3a4a"/>
      {/* hair */}
      <ellipse cx="110" cy="22" rx="18" ry="8" fill="#030d18"/>
      {/* face detail */}
      <ellipse cx="103" cy="32" rx="5" ry="3" fill="#0f2a38"/>
      <ellipse cx="117" cy="32" rx="5" ry="3" fill="#0f2a38"/>
      <circle  cx="101" cy="30" r="1.5" fill="#7dd3fc" opacity="0.85"/>
      <circle  cx="115" cy="30" r="1.5" fill="#7dd3fc" opacity="0.7"/>
      {/* arms in water */}
      <path d="M88 68 Q68 74 55 80" stroke="#0d2a3a" strokeWidth="10" strokeLinecap="round"/>
      <path d="M132 68 Q152 74 165 80" stroke="#0d2a3a" strokeWidth="10" strokeLinecap="round"/>
      {/* ripples */}
      <ellipse cx="110" cy="76" rx="28" ry="5" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.55"/>
      <ellipse cx="110" cy="76" rx="42" ry="8" fill="none" stroke="#38bdf8" strokeWidth="0.7" opacity="0.3"/>
      {/* blue ambient on face */}
      <ellipse cx="110" cy="34" rx="20" ry="20" fill="#38bdf8" opacity="0.07"/>
    </svg>
  );

  // warm-indoor
  return (
    <svg viewBox="0 0 220 124" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill="#150800"/>
      <defs>
        <linearGradient id="warmindoor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#d97706" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#150800" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="220" height="124" fill="url(#warmindoor)"/>
      {/* wall & window */}
      <rect x="130" y="0" width="90" height="80" fill="#1c0d02" opacity="0.6"/>
      <rect x="138" y="8"  width="35" height="55" fill="#f97316" opacity="0.12"/>
      <rect x="176" y="8"  width="30" height="55" fill="#f97316" opacity="0.10"/>
      {/* floor */}
      <rect y="90" width="220" height="34" fill="#100600"/>
      {/* table */}
      <rect x="30" y="84" width="160" height="6" rx="1" fill="#3d1a06"/>
      {/* person — backlit profile */}
      <rect x="88" y="70" width="22" height="28" rx="3" fill="#1e0d04"/>
      <ellipse cx="99" cy="60" rx="22" ry="24" fill="#180b03"/>
      {/* hair */}
      <path d="M77 58 Q79 30 99 30 Q119 30 121 58" fill="#0a0400"/>
      {/* warm rim right edge */}
      <path d="M119 36 Q128 58 118 82" stroke="#fbbf24" strokeWidth="5" opacity="0.65" fill="none" strokeLinecap="round"/>
      <path d="M117 36 Q125 58 116 82" stroke="#f97316" strokeWidth="2" opacity="0.35" fill="none" strokeLinecap="round"/>
      {/* face detail */}
      <ellipse cx="92" cy="57" rx="8" ry="5" fill="#130900"/>
      <circle  cx="90" cy="55" r="1.5" fill="#fde68a" opacity="0.65"/>
      {/* shoulder */}
      <path d="M52 124 Q68 96 99 94 Q130 96 148 124Z" fill="#0f0602"/>
      {/* ambient warm glow */}
      <ellipse cx="99" cy="60" rx="35" ry="35" fill="#f97316" opacity="0.05"/>
    </svg>
  );
}

// ─── Tag Badge ────────────────────────────────────────────────────────────────

function Tag({ label, color }: { label: string; color: string }) {
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
      {/* Thumbnail */}
      <div className="relative" style={{ height: 110 }}>
        <Thumb scene={asset.scene} />

        {/* Play button bottom-left */}
        <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <Play size={9} className="translate-x-[1px] text-white" fill="white"/>
        </div>

        {/* Duration bottom-right */}
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-[2px] text-[9px] font-medium text-white">
          {asset.duration}
        </div>

        {/* Select highlight */}
        {selected && <div className="absolute inset-0 bg-blue-500/10"/>}
      </div>

      {/* Meta */}
      <div className="px-2.5 py-2 space-y-1.5">
        {/* Filename */}
        <p className="truncate text-[9px] font-medium text-slate-200 leading-tight">{asset.file}</p>
        {/* Creator + date */}
        <p className="text-[8px] text-slate-500">{asset.creator} | {asset.date}</p>
        {/* Tag + dropdown row */}
        <div className="flex items-center justify-between gap-1">
          <Tag label={asset.tag} color={asset.tagColor} />
          <div className="flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-[3px] cursor-pointer">
            <span className="text-[8px] text-slate-400">Select an option</span>
            <ChevronDown size={7} className="text-slate-500"/>
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

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className="flex w-[155px] shrink-0 flex-col border-r border-white/[.07] bg-[#090d13] overflow-y-auto [&::-webkit-scrollbar]:hidden">

        {/* Assets */}
        <div className="px-2 pt-3">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Assets</p>
          <SideItem icon={<FolderOpen size={10}/>} label="All Assets"/>
          <SideItem label="Episodes"/>
          <SideItem label="Key Scenes" active/>
          <SideItem label="Teaser"/>
          <SideItem label="Location"/>
        </div>

        <div className="my-2 mx-2 border-t border-white/[.06]"/>

        {/* Collections */}
        <div className="px-2">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Collections</p>
          <SideItem label="Needs Re-structuring"/>
          <SideItem label="Videos"/>
          <SideItem label="Images"/>
          <SideItem label="Audio"/>
          <SideItem label="Needs Review" badge={9}/>
          <SideItem label="Approved"/>
          <div className="mt-0.5 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plus size={9}/><span>New Collection</span>
          </div>
        </div>

        <div className="my-2 mx-2 border-t border-white/[.06]"/>

        {/* Shares */}
        <div className="px-2">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Shares</p>
          <SideItem label="All Shares (2)"/>
          <SideItem label="Teaser #2"/>
          <SideItem label="Teaser v1"/>
          <div className="mt-0.5 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plus size={9}/><span>New Share</span>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-auto border-t border-white/[.06] px-2 py-2">
          <div className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Link2 size={10}/><span>CSC Connections</span>
          </div>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top navbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[.07] bg-[#090d13] px-3" style={{ height: 38 }}>
          {/* Left breadcrumb */}
          <div className="flex items-center gap-1.5">
            <ChevronLeft size={13} className="text-slate-500 cursor-pointer hover:text-slate-300"/>
            <span className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">Teaser</span>
            <span className="text-[10px] text-slate-600 mx-0.5">|</span>
            <span className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">All Assets</span>
            <span className="text-[10px] text-slate-600 mx-0.5">|</span>
            <span className="text-[10px] font-semibold text-white border-b border-white pb-[1px]">Key Scenes</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1">
              <Search size={9} className="text-slate-500"/>
              <span className="text-[9px] text-slate-500">Search in Key Scenes</span>
            </div>
            <Users size={13} className="text-slate-500 cursor-pointer hover:text-slate-300"/>
            <Bell  size={13} className="text-slate-500 cursor-pointer hover:text-slate-300"/>
            <div  className="h-[13px] w-[13px] rounded border border-white/20 cursor-pointer"/>
            {/* Avatar */}
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-white">
              CD
              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-400 ring-1 ring-[#090d13]"/>
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[.07] bg-[#0d1117] px-3 py-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">10 Assets · <span className="text-slate-500">514.08 GB</span></span>
            <div className="flex items-center gap-0.5">
              {["Appearance","Fields","Validate"].map(tab=>(
                <button key={tab} className={`rounded px-2 py-[3px] text-[9px] font-medium transition-colors ${tab==="Appearance" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer hover:text-slate-200">
              <SlidersHorizontal size={9}/>
              <span>Sorted by: Date Uploaded</span>
              <ChevronDown size={9}/>
            </div>
            <div className="flex items-center gap-0.5 rounded border border-white/10 p-0.5">
              <button onClick={()=>setView("grid")} className={`rounded p-1 transition-colors ${view==="grid" ? "bg-white/15 text-white" : "text-slate-500 hover:text-slate-300"}`}><LayoutGrid size={10}/></button>
              <button onClick={()=>setView("list")} className={`rounded p-1 transition-colors ${view==="list" ? "bg-white/15 text-white" : "text-slate-500 hover:text-slate-300"}`}><List size={10}/></button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-4 gap-2.5">
            {ASSETS.map(asset=>(
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selected===asset.id}
                onSelect={()=>setSelected(selected===asset.id ? null : asset.id)}
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
