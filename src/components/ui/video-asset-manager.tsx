"use client";

import { useState } from "react";
import {
  Search, Menu, Plus, ChevronLeft, ChevronRight, MessageSquare,
  Share2, Check, Film, Plug, Settings, MonitorPlay,
  User, FolderOpen, Tag, Star, Image, Eye, RotateCcw,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const ASSETS = [
  {
    id: 1, duration: "0:14", res: "2K", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #0f172a, #1e293b, #334155)",
    scene: "night-spotlight", label: "Scene 01 — Night Ext.",
  },
  {
    id: 2, duration: "0:32", res: "HD", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #431407, #7c2d12, #92400e)",
    scene: "interior-warm", label: "Scene 04 — Int. Living Room",
  },
  {
    id: 3, duration: "0:21", res: "2K", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #020617, #0f172a, #1e1b4b)",
    scene: "silhouette", label: "Scene 07 — Backlit Silhouette",
  },
  {
    id: 4, duration: "0:18", res: "", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #082f49, #1e3a5f, #1e293b)",
    scene: "closeup-blue", label: "Scene 09 — CU Face",
  },
  {
    id: 5, duration: "0:09", res: "HD", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #431407, #78350f, #713f12)",
    scene: "closeup-warm", label: "Scene 12 — CU Portrait",
  },
  {
    id: 6, duration: "1:00", res: "2K", comments: 0, approved: true,
    bg: "linear-gradient(to bottom right, #09090b, #18181b, #262626)",
    scene: "dramatic-dark", label: "Scene 14 — Dramatic CU",
  },
  {
    id: 7, duration: "0:47", res: "", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #083344, #0f172a, #172554)",
    scene: "pool-lit", label: "Scene 18 — Pool Sequence",
  },
  {
    id: 8, duration: "0:33", res: "HD", comments: 0, approved: false,
    bg: "linear-gradient(to bottom right, #78350f, #713f12, #7c2d12)",
    scene: "golden-urban", label: "Scene 21 — Golden Hour",
  },
];

const SIDEBAR = {
  assets: ["All Assets", "Episodes", "Key Scenes", "Teaser", "Location"],
  collections: [
    { label: "Needs Retouching" },
    { label: "Videos" },
    { label: "Images" },
    { label: "Review", badge: 33 },
    { label: "Needs Review" },
    { label: "Approved" },
  ],
  shares: ["All Shares (2)", "Shares", "06/29/2024", "Teaser v2"],
};

// ─── Mini scene SVG illustrations ────────────────────────────────────────────

function SceneIllustration({ scene, bg }: { scene: string; bg: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      {/* Film grain overlay */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {scene === "night-spotlight" && (
        <>
          <div className="absolute bottom-4 left-6 h-16 w-10 rounded-sm bg-slate-700/60" />
          <div className="absolute bottom-4 left-5 h-24 w-1.5 bg-slate-600/40" />
          {/* spotlight cone */}
          <div className="absolute bottom-0 left-8 h-20 w-28 origin-bottom-left -rotate-12 bg-gradient-to-t from-yellow-200/30 to-transparent" style={{ clipPath: "polygon(0 100%, 100% 100%, 60% 0)" }} />
          <div className="absolute bottom-5 right-8 h-14 w-3 rounded-full bg-slate-500/50" />
        </>
      )}
      {scene === "interior-warm" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-950/60" />
          <div className="absolute bottom-3 left-5 h-12 w-6 rounded-t-full bg-amber-800/70" />
          <div className="absolute bottom-3 right-6 h-11 w-6 rounded-t-full bg-orange-700/60" />
          <div className="absolute top-3 right-4 h-5 w-8 rounded-sm bg-amber-700/40" />
          <div className="absolute top-2 left-1/2 h-4 w-12 -translate-x-1/2 rounded-sm bg-amber-600/20" />
        </>
      )}
      {scene === "silhouette" && (
        <>
          {/* bright backlight */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-white/20 blur-xl" />
          </div>
          {/* silhouette person */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <div className="mx-auto h-4 w-4 rounded-full bg-black/90" />
            <div className="mx-auto h-14 w-6 rounded-t-sm bg-black/90" />
          </div>
        </>
      )}
      {scene === "closeup-blue" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 to-transparent" />
          <div className="absolute right-2 top-1/2 h-20 w-12 -translate-y-1/2 rounded-full bg-sky-900/50 blur-sm" />
          <div className="absolute left-3 top-1/2 h-16 w-10 -translate-y-1/2 rounded-full bg-slate-800/70" />
        </>
      )}
      {scene === "closeup-warm" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-bl from-orange-700/40 to-transparent" />
          <div className="absolute right-3 top-1/2 h-20 w-14 -translate-y-1/2 rounded-full bg-amber-800/50" />
        </>
      )}
      {scene === "dramatic-dark" && (
        <>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute left-4 top-1/2 h-20 w-2 -translate-y-1/2 bg-white/10 blur-sm" />
          <div className="absolute right-6 bottom-4 h-12 w-10 rounded-full bg-zinc-700/40" />
        </>
      )}
      {scene === "pool-lit" && (
        <>
          <div className="absolute bottom-0 h-10 w-full bg-gradient-to-t from-cyan-500/20 to-transparent" />
          <div className="absolute bottom-2 left-1/2 h-12 w-8 -translate-x-1/2 rounded-t-full bg-cyan-900/60" />
          {/* light ripple */}
          <div className="absolute bottom-4 left-1/2 h-6 w-16 -translate-x-1/2 rounded-full border border-cyan-400/20" />
          <div className="absolute bottom-6 left-1/2 h-8 w-24 -translate-x-1/2 rounded-full border border-cyan-400/10" />
        </>
      )}
      {scene === "golden-urban" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/60 to-yellow-700/20" />
          <div className="absolute bottom-0 left-0 h-16 w-8 bg-amber-950/70" />
          <div className="absolute bottom-0 right-2 h-20 w-6 bg-amber-900/60" />
          <div className="absolute bottom-3 left-1/2 h-14 w-5 -translate-x-1/2 rounded-t-sm bg-amber-800/50" />
        </>
      )}

      {/* vignette */}
      <div className="absolute inset-0 rounded-sm" style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, selected, onSelect }: {
  asset: typeof ASSETS[0];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className={`group cursor-pointer rounded-md overflow-hidden transition-all duration-150 ${selected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-white/20"}`}
      onClick={onSelect}>
      {/* Thumbnail */}
      <div className="relative h-[105px] bg-slate-900">
        <SceneIllustration scene={asset.scene} bg={asset.bg} />

        {/* Comment badge top-left */}
        <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5">
          <MessageSquare size={8} className="text-white/60" />
          <span className="text-[9px] text-white/70">{asset.comments}</span>
        </div>

        {/* Duration top-right */}
        <div className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
          {asset.duration}
        </div>

        {/* Resolution badge */}
        {asset.res && (
          <div className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1 py-0.5 text-[8px] font-semibold text-white/80">
            {asset.res}
          </div>
        )}

        {/* MOV badge */}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5">
          <Film size={7} className="text-white/50" />
          <span className="text-[8px] text-white/60">.mov</span>
        </div>

        {/* Select overlay */}
        <div className={`absolute inset-0 bg-blue-500/10 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
        <div className={`absolute right-1.5 bottom-6 flex h-4 w-4 items-center justify-center rounded-full border transition-all ${selected ? "border-blue-400 bg-blue-500" : "border-white/30 bg-black/40"}`}>
          {selected && <Check size={9} className="text-white" />}
        </div>
      </div>

      {/* Meta */}
      <div className="bg-[#0f1829] px-2 py-1.5">
        <p className="truncate text-[9px] font-medium text-slate-300">{asset.label}</p>
        <p className="text-[8px] text-slate-500">Alfonso Martinez · Oct 19th, 2024</p>

        {/* Approved badge */}
        {asset.approved && (
          <div className="mt-1 inline-flex items-center gap-0.5 rounded bg-orange-500/20 px-1 py-0.5">
            <Check size={7} className="text-orange-400" />
            <span className="text-[8px] text-orange-400">Approved</span>
          </div>
        )}

        {/* Role dropdown mock */}
        <div className="mt-1.5 flex gap-1">
          <div className="flex flex-1 items-center justify-between rounded border border-slate-700/60 bg-[#0d1525] px-1.5 py-[3px]">
            <span className="text-[8px] text-slate-500">Role</span>
            <ChevronRight size={7} className="rotate-90 text-slate-600" />
          </div>
          <div className="flex flex-1 items-center justify-between rounded border border-slate-700/60 bg-[#0d1525] px-1.5 py-[3px]">
            <span className="text-[8px] text-slate-500">Select…</span>
            <ChevronRight size={7} className="rotate-90 text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

function SideItem({ label, active, badge }: { label: string; active?: boolean; badge?: number }) {
  return (
    <div className={`flex cursor-pointer items-center justify-between rounded px-2 py-[5px] text-[10px] transition-colors ${active ? "bg-blue-600/20 text-blue-300 font-medium" : "text-slate-400 hover:bg-white/5 hover:text-slate-300"}`}>
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white">{badge}</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoAssetManager() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("Key Scenes");

  const TABS = ["All Assets", "Key Scenes"];

  return (
    <div className="flex h-full w-full overflow-hidden rounded-sm bg-[#0a1220] font-sans text-white select-none">

      {/* ── Sidebar ── */}
      <div className="flex w-[148px] shrink-0 flex-col overflow-y-auto border-r border-slate-800/60 bg-[#080e1a] py-2 [&::-webkit-scrollbar]:hidden">

        {/* Assets section */}
        <div className="px-2">
          <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Assets</p>
          {SIDEBAR.assets.map((item) => (
            <SideItem key={item} label={item} active={item === "Key Scenes"} />
          ))}
        </div>

        <div className="my-2 border-t border-slate-800/50" />

        {/* Collections */}
        <div className="px-2">
          <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Collections</p>
          {SIDEBAR.collections.map((item) => (
            <SideItem key={item.label} label={item.label} badge={item.badge} />
          ))}
          <div className="mt-0.5 flex cursor-pointer items-center gap-1 rounded px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plus size={9} /> <span>New Collection</span>
          </div>
        </div>

        <div className="my-2 border-t border-slate-800/50" />

        {/* Shares */}
        <div className="px-2">
          <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Shares</p>
          {SIDEBAR.shares.map((item) => (
            <SideItem key={item} label={item} />
          ))}
          <div className="mt-0.5 flex cursor-pointer items-center gap-1 rounded px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plus size={9} /> <span>New Share</span>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-auto border-t border-slate-800/50 px-2 pt-2">
          <div className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-[5px] text-[10px] text-slate-500 hover:text-slate-300">
            <Plug size={10} /> <span>CSI Connections</span>
          </div>
          <div className="mt-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-700 text-slate-500 hover:text-slate-300">
            <Settings size={10} />
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top navbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#080e1a] px-3 py-0" style={{ height: 36 }}>
          {/* Left */}
          <div className="flex items-center gap-2">
            <Search size={11} className="text-slate-500" />
            <Menu size={11} className="text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-200">Teaser</span>
            <div className="flex items-center gap-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-2 py-[9px] text-[10px] font-medium transition-colors ${activeTab === tab ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            <button className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500">
              <Plus size={10} className="text-white" />
            </button>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700">
              <User size={9} className="text-slate-300" />
            </div>
            <ChevronLeft size={11} className="text-slate-600" />
            <ChevronRight size={11} className="text-slate-400 hover:text-slate-200 cursor-pointer" />
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-4 gap-2">
            {ASSETS.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedId === asset.id}
                onSelect={() => setSelectedId(selectedId === asset.id ? null : asset.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800/60 bg-[#080e1a] px-4 py-1.5">
          <span className="text-[10px] text-slate-500">23 items</span>
        </div>
      </div>
    </div>
  );
}
