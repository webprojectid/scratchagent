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

function SceneIllustration({ scene }: { scene: string }) {
  if (scene === "night-spotlight") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#0a0e18"/>
      {/* ground */}
      <rect y="72" width="171" height="33" fill="#0d1220"/>
      {/* car body */}
      <rect x="18" y="52" width="60" height="22" rx="3" fill="#1a2035"/>
      <rect x="26" y="44" width="38" height="14" rx="2" fill="#151c2e"/>
      {/* car windows */}
      <rect x="29" y="46" width="15" height="10" rx="1" fill="#1e3a5f" opacity="0.8"/>
      <rect x="46" y="46" width="15" height="10" rx="1" fill="#1e3a5f" opacity="0.6"/>
      {/* car wheels */}
      <circle cx="30" cy="74" r="6" fill="#0d1118"/><circle cx="30" cy="74" r="3" fill="#1e2535"/>
      <circle cx="65" cy="74" r="6" fill="#0d1118"/><circle cx="65" cy="74" r="3" fill="#1e2535"/>
      {/* headlights */}
      <ellipse cx="78" cy="60" rx="3" ry="2" fill="#fffde0"/>
      <path d="M78 60 L110 50 L110 70 Z" fill="url(#hl)" opacity="0.35"/>
      <defs><radialGradient id="hl" cx="0%" cy="50%"><stop offset="0%" stopColor="#fffde0" stopOpacity="0.9"/><stop offset="100%" stopColor="#fffde0" stopOpacity="0"/></radialGradient></defs>
      {/* person silhouette */}
      <ellipse cx="118" cy="55" rx="5" ry="5" fill="#111"/>
      <rect x="114" y="60" width="8" height="16" rx="2" fill="#111"/>
      {/* spotlight cone from top */}
      <path d="M130 0 L115 58 L145 58 Z" fill="url(#sp)" opacity="0.25"/>
      <defs><linearGradient id="sp" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#fff9c4"/><stop offset="100%" stopColor="#fff9c4" stopOpacity="0"/></linearGradient></defs>
      {/* ground reflection */}
      <ellipse cx="130" cy="75" rx="20" ry="5" fill="#fffde0" opacity="0.06"/>
      {/* stars */}
      {[20,45,90,140,160,10,75].map((x,i)=><circle key={i} cx={x} cy={[8,15,5,12,20,25,3][i]} r="0.8" fill="white" opacity="0.6"/>)}
    </svg>
  );

  if (scene === "interior-warm") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#1a0a04"/>
      {/* warm wall */}
      <rect width="171" height="75" fill="#2d1205"/>
      {/* floor */}
      <rect y="75" width="171" height="30" fill="#1a0c05"/>
      {/* window light */}
      <rect x="110" y="10" width="45" height="50" fill="#7c3a0a" opacity="0.4" rx="2"/>
      <rect x="115" y="14" width="18" height="42" fill="#f97316" opacity="0.15"/>
      <rect x="136" y="14" width="16" height="42" fill="#f97316" opacity="0.12"/>
      {/* table */}
      <rect x="40" y="70" width="90" height="5" rx="1" fill="#3d1a08"/>
      <rect x="52" y="75" width="5" height="15" fill="#2d1205"/>
      <rect x="112" y="75" width="5" height="15" fill="#2d1205"/>
      {/* candle/lamp glow */}
      <ellipse cx="85" cy="65" rx="22" ry="18" fill="#f97316" opacity="0.08"/>
      <rect x="83" y="60" width="4" height="8" fill="#92400e"/>
      <ellipse cx="85" cy="59" rx="3" ry="4" fill="#fbbf24" opacity="0.9"/>
      {/* person left */}
      <ellipse cx="52" cy="50" rx="9" ry="9" fill="#7c3a0a"/>
      <rect x="40" y="59" width="24" height="20" rx="3" fill="#5a2d0c"/>
      {/* person right */}
      <ellipse cx="122" cy="48" rx="8" ry="8" fill="#92400e"/>
      <rect x="111" y="56" width="22" height="18" rx="3" fill="#78350f"/>
      {/* warm overlay */}
      <rect width="171" height="105" fill="#f97316" opacity="0.05"/>
    </svg>
  );

  if (scene === "silhouette") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#04060f"/>
      {/* bright backlight source */}
      <radialGradient id="backlight" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#e0e8ff" stopOpacity="0.95"/>
        <stop offset="40%" stopColor="#a5b4fc" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0"/>
      </radialGradient>
      <ellipse cx="85" cy="52" rx="55" ry="45" fill="url(#backlight)"/>
      {/* door frame */}
      <rect x="55" y="15" width="62" height="75" rx="1" fill="#e0e8ff" opacity="0.12"/>
      <rect x="57" y="17" width="58" height="71" rx="1" fill="#c7d2fe" opacity="0.18"/>
      {/* person silhouette — full body */}
      <ellipse cx="86" cy="45" rx="9" ry="9" fill="#000"/>
      <path d="M77 54 Q86 52 95 54 L97 90 L75 90 Z" fill="#000"/>
      {/* arm left */}
      <path d="M77 58 L62 72" stroke="#000" strokeWidth="7" strokeLinecap="round"/>
      {/* arm right */}
      <path d="M95 58 L108 70" stroke="#000" strokeWidth="6" strokeLinecap="round"/>
      {/* rim light edge */}
      <path d="M77 54 Q75 65 76 80" stroke="#818cf8" strokeWidth="1.5" opacity="0.5"/>
      <path d="M95 54 Q97 65 96 80" stroke="#818cf8" strokeWidth="1.5" opacity="0.5"/>
      {/* floor glow */}
      <ellipse cx="86" cy="90" rx="30" ry="6" fill="#a5b4fc" opacity="0.1"/>
    </svg>
  );

  if (scene === "closeup-blue") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#050d1a"/>
      {/* blue key light */}
      <radialGradient id="bluelight" cx="70%" cy="40%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5"/>
        <stop offset="100%" stopColor="#050d1a" stopOpacity="0"/>
      </radialGradient>
      <ellipse cx="130" cy="42" rx="60" ry="55" fill="url(#bluelight)"/>
      {/* face profile — looking right */}
      {/* neck */}
      <rect x="76" y="72" width="20" height="20" rx="3" fill="#1e1a14"/>
      {/* head */}
      <ellipse cx="90" cy="52" rx="22" ry="24" fill="#2a2018"/>
      {/* ear */}
      <ellipse cx="68" cy="54" rx="5" ry="7" fill="#231d14"/>
      {/* eye shadow / eye area */}
      <ellipse cx="88" cy="48" rx="8" ry="5" fill="#1a1510"/>
      <ellipse cx="100" cy="50" rx="6" ry="4" fill="#1a1510"/>
      {/* nose bridge highlight */}
      <path d="M84 45 Q86 52 85 58" stroke="#4a3f2e" strokeWidth="2" fill="none"/>
      {/* blue rim light on cheek */}
      <path d="M108 38 Q115 52 108 68" stroke="#60a5fa" strokeWidth="3" opacity="0.6" fill="none" strokeLinecap="round"/>
      {/* shoulder */}
      <path d="M55 90 Q70 78 90 78 Q110 78 125 90 L125 105 L55 105Z" fill="#111820"/>
      {/* hair */}
      <ellipse cx="90" cy="32" rx="22" ry="10" fill="#111"/>
      {/* catch light in eye */}
      <circle cx="95" cy="50" r="1.5" fill="#93c5fd" opacity="0.8"/>
    </svg>
  );

  if (scene === "closeup-warm") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#1c0a02"/>
      {/* warm orange key light */}
      <radialGradient id="warmlight" cx="75%" cy="35%">
        <stop offset="0%" stopColor="#f97316" stopOpacity="0.7"/>
        <stop offset="100%" stopColor="#1c0a02" stopOpacity="0"/>
      </radialGradient>
      <ellipse cx="130" cy="35" rx="70" ry="60" fill="url(#warmlight)"/>
      {/* neck */}
      <rect x="72" y="74" width="22" height="22" rx="3" fill="#3d1f0a"/>
      {/* head — slightly turned */}
      <ellipse cx="85" cy="50" rx="25" ry="26" fill="#4a2510"/>
      {/* ear */}
      <ellipse cx="60" cy="52" rx="5" ry="8" fill="#3d1f0a"/>
      {/* eye area */}
      <ellipse cx="82" cy="46" rx="10" ry="6" fill="#3a1e0a"/>
      {/* nose */}
      <path d="M80 48 Q82 55 80 60" stroke="#5a2e10" strokeWidth="2.5" fill="none"/>
      {/* lips */}
      <path d="M74 65 Q82 68 90 65" stroke="#7c3010" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* hair */}
      <path d="M60 48 Q62 22 85 22 Q108 22 110 48" fill="#1a0c02"/>
      {/* orange rim highlight */}
      <path d="M107 32 Q116 50 108 72" stroke="#fb923c" strokeWidth="4" opacity="0.55" fill="none" strokeLinecap="round"/>
      {/* shoulder */}
      <path d="M45 105 Q60 80 85 80 Q110 80 128 105Z" fill="#2d1205"/>
      {/* catch light */}
      <circle cx="88" cy="46" r="1.5" fill="#fed7aa" opacity="0.9"/>
    </svg>
  );

  if (scene === "dramatic-dark") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#050505"/>
      {/* thin hard light from left */}
      <defs>
        <linearGradient id="hardlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18"/>
          <stop offset="30%" stopColor="#fff" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="105" fill="url(#hardlight)"/>
      {/* neck */}
      <rect x="74" y="74" width="20" height="22" rx="2" fill="#1a1410"/>
      {/* head — slightly lit on left side */}
      <ellipse cx="84" cy="50" rx="24" ry="26" fill="#110e0a"/>
      {/* lit half of face */}
      <path d="M84 24 Q60 24 60 50 Q60 76 84 76 Z" fill="#2a2018" opacity="0.8"/>
      {/* eye shadow */}
      <ellipse cx="72" cy="46" rx="8" ry="5" fill="#1a160e"/>
      <ellipse cx="88" cy="46" rx="6" ry="4" fill="#0f0d09"/>
      {/* catch light */}
      <circle cx="70" cy="44" r="2" fill="#f5f0e8" opacity="0.85"/>
      {/* nose */}
      <path d="M78 48 Q80 56 78 61" stroke="#3a3020" strokeWidth="2" fill="none"/>
      {/* lips — tight */}
      <path d="M72 67 Q80 69 88 67" stroke="#3a2a18" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* hair dark */}
      <path d="M60 46 Q62 20 84 20 Q106 20 108 46" fill="#050505"/>
      {/* shoulder */}
      <path d="M40 105 Q58 80 84 80 Q110 80 130 105Z" fill="#080808"/>
      {/* orange approved glow hint */}
      <rect x="0" y="0" width="171" height="105" fill="#f97316" opacity="0.03"/>
    </svg>
  );

  if (scene === "pool-lit") return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#04111e"/>
      {/* pool water */}
      <rect y="62" width="171" height="43" fill="#062540"/>
      {/* underwater light glow */}
      <radialGradient id="poollight" cx="50%" cy="100%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8"/>
        <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.2"/>
        <stop offset="100%" stopColor="#04111e" stopOpacity="0"/>
      </radialGradient>
      <ellipse cx="85" cy="105" rx="60" ry="40" fill="url(#poollight)"/>
      {/* water surface shimmer */}
      <path d="M0 62 Q20 59 40 62 Q60 65 80 62 Q100 59 120 62 Q140 65 160 62 L171 62 L171 68 L0 68Z" fill="#0ea5e9" opacity="0.15"/>
      {/* pool edge/rim */}
      <rect y="58" width="171" height="5" fill="#083a5e"/>
      {/* person in water — upper body */}
      <ellipse cx="85" cy="52" rx="12" ry="12" fill="#1a3a4a"/>
      <rect x="70" y="57" width="30" height="14" rx="4" fill="#0f2a3a"/>
      {/* arms in water */}
      <path d="M70 64 Q55 68 48 72" stroke="#0f2a3a" strokeWidth="7" strokeLinecap="round"/>
      <path d="M100 64 Q115 68 122 72" stroke="#0f2a3a" strokeWidth="7" strokeLinecap="round"/>
      {/* water ripples from body */}
      <ellipse cx="85" cy="63" rx="18" ry="4" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="85" cy="63" rx="28" ry="6" fill="none" stroke="#38bdf8" strokeWidth="0.7" opacity="0.3"/>
      {/* blue light on face */}
      <ellipse cx="85" cy="50" rx="14" ry="14" fill="#38bdf8" opacity="0.08"/>
      {/* hair */}
      <ellipse cx="85" cy="42" rx="12" ry="6" fill="#050d18"/>
      {/* catch light */}
      <circle cx="89" cy="50" r="1.5" fill="#7dd3fc" opacity="0.9"/>
    </svg>
  );

  // golden-urban
  return (
    <svg viewBox="0 0 171 105" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="171" height="105" fill="#1a0d02"/>
      {/* golden sky/bg */}
      <defs>
        <linearGradient id="goldensky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#1a0d02" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="171" height="105" fill="url(#goldensky)"/>
      {/* urban buildings bg */}
      <rect x="0" y="30" width="20" height="75" fill="#0d0702"/>
      <rect x="22" y="20" width="15" height="85" fill="#110904"/>
      <rect x="130" y="25" width="18" height="80" fill="#0d0702"/>
      <rect x="150" y="35" width="21" height="70" fill="#110904"/>
      {/* windows in buildings */}
      {[[5,38],[5,50],[5,62],[25,28],[25,40],[25,52],[133,33],[133,45],[153,42],[153,54]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="5" height="4" rx="0.5" fill="#f59e0b" opacity="0.4"/>
      ))}
      {/* ground */}
      <rect y="80" width="171" height="25" fill="#0f0804"/>
      {/* person profile — golden rim */}
      <rect x="72" y="74" width="18" height="22" rx="2" fill="#2d1a06"/>
      <ellipse cx="81" cy="52" rx="20" ry="22" fill="#1e1006"/>
      {/* hair */}
      <path d="M61 50 Q63 28 81 28 Q99 28 101 50" fill="#0a0602"/>
      {/* golden rim light on profile edge */}
      <path d="M100 32 Q108 52 100 74" stroke="#fbbf24" strokeWidth="4" opacity="0.7" fill="none" strokeLinecap="round"/>
      <path d="M98 32 Q105 52 98 74" stroke="#f59e0b" strokeWidth="2" opacity="0.4" fill="none" strokeLinecap="round"/>
      {/* eye */}
      <ellipse cx="78" cy="50" rx="7" ry="4" fill="#140e04"/>
      <circle cx="79" cy="49" r="1.5" fill="#fde68a" opacity="0.7"/>
      {/* nose */}
      <path d="M76 52 Q78 58 76 62" stroke="#3a2208" strokeWidth="2" fill="none"/>
      {/* shoulder */}
      <path d="M45 105 Q60 80 81 80 Q102 80 118 105Z" fill="#150c03"/>
      {/* lens flare */}
      <circle cx="145" cy="18" r="8" fill="#fbbf24" opacity="0.15"/>
      <circle cx="145" cy="18" r="3" fill="#fbbf24" opacity="0.3"/>
    </svg>
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
        <SceneIllustration scene={asset.scene} />

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
