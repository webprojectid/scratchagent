"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/lang";
import { HeaderNav } from "@/components/header-nav";

// demos
import { SafariFrame } from "@/components/ui/safari-browser-frame";
import { VideoAssetManager } from "@/components/ui/video-asset-manager";
import { CaleidoCrmDashboard } from "@/components/ui/caleido-crm-demo";
import { AutoFinanceDashboard } from "@/components/ui/auto-finance-demo";
import { EfferdDashboard2 } from "@/components/ui/efferd-dashboard-2";
import { CopyPrompt } from "@/components/ui/copy-prompt";

// ─── Data ────────────────────────────────────────────────────────────────────

const PROMPTS = {
  en: [
    `Build a dark-themed video asset management dashboard for a film production team. Include a left sidebar with asset collections (Key Scenes, Episodes, Locations). Main area shows a 2×4 grid of video thumbnails with filename, uploader, date, duration badge, and status tag. Add a top breadcrumb bar with search, user avatar, and notification icons. Dark navy color scheme (#0d1117). Stack: React, Tailwind CSS, TypeScript.`,
    `Build a light-mode CRM sales dashboard called "Caleido". Layout: left sidebar with welcome greeting, 2×3 stat cards, and task progress bars. Center panel: orange gradient banner, activity feed tabs, and a vertical timeline of CRM events with audio waveform player. Right panel: contact detail view with profile photo, action buttons, and deal metadata rows. Accent color orange (#ef672f). Stack: React, Tailwind CSS, TypeScript.`,
    `Build a vehicle purchase and financing web app on a dark navy gradient background. Top nav with logo and Vehicles / Application / Profile links. Main content: vehicle header with specs and monthly payment, interactive image gallery with 4 thumbnails, collapsible spec accordion, financing breakdown table, and dealer info card with contact button. Stack: React, Tailwind CSS, TypeScript.`,
    `Build a dark-mode analytics dashboard for a SaaS business. Left sidebar with navigation icons. Main area: 4 KPI cards with trend indicators, a revenue line chart spanning 12 months, and a weekly active users bar chart. Right panel: recent transactions list and top channels breakdown with progress bars. Color scheme: dark (#0f1117) with purple accent (#7c3aed). Stack: React, Tailwind CSS, TypeScript.`,
  ],
  id: [
    `Buat dashboard manajemen aset video bertema gelap untuk tim produksi film. Sidebar kiri dengan koleksi aset (Key Scenes, Episodes, Locations). Area utama menampilkan grid 2×4 thumbnail video lengkap dengan nama file, uploader, tanggal, badge durasi, dan tag status. Top bar breadcrumb dengan pencarian, avatar, dan notifikasi. Skema warna navy gelap (#0d1117). Stack: React, Tailwind CSS, TypeScript.`,
    `Buat dashboard CRM sales bertema terang bernama "Caleido". Layout: sidebar kiri dengan salam, grid 2×3 kartu statistik, dan progress bar tugas. Panel tengah: banner gradien oranye, tab activity feed, dan timeline vertikal event CRM dengan audio waveform. Panel kanan: detail kontak dengan foto, tombol aksi, dan baris metadata deal. Aksen oranye (#ef672f). Stack: React, Tailwind CSS, TypeScript.`,
    `Buat aplikasi web pembelian dan pembiayaan kendaraan dengan latar gradien navy gelap. Navbar atas dengan logo dan tautan Vehicles / Application / Profile. Konten utama: header kendaraan dengan spesifikasi dan cicilan bulanan, galeri gambar interaktif dengan 4 thumbnail, accordion spesifikasi, tabel rincian pembiayaan, dan kartu dealer. Stack: React, Tailwind CSS, TypeScript.`,
    `Buat dashboard analitik dark-mode untuk bisnis SaaS. Sidebar kiri dengan ikon navigasi. Area utama: 4 kartu KPI dengan indikator tren, grafik garis revenue 12 bulan, dan grafik batang pengguna aktif mingguan. Panel kanan: daftar transaksi terbaru dan rincian top channel dengan progress bar. Skema gelap (#0f1117) aksen ungu (#7c3aed). Stack: React, Tailwind CSS, TypeScript.`,
  ],
};

const META = {
  en: [
    { num: "01", type: "Video Asset Management",   title: "Video asset manager for film teams.",          url: "frameio.app" },
    { num: "02", type: "CRM & Sales Dashboard",     title: "CRM dashboard for sales teams.",              url: "caleido.app/dashboard" },
    { num: "03", type: "Auto Finance Platform",     title: "Auto finance platform, built to close.",      url: "autoapp.io/vehicles" },
    { num: "04", type: "SaaS Analytics Dashboard",  title: "Analytics dashboard for SaaS teams.",         url: "efferd.app/dashboard" },
  ],
  id: [
    { num: "01", type: "Manajemen Aset Video",      title: "Manajemen aset video untuk tim film.",        url: "frameio.app" },
    { num: "02", type: "Dashboard CRM & Penjualan", title: "Dashboard CRM untuk tim penjualan.",          url: "caleido.app/dashboard" },
    { num: "03", type: "Platform Pembiayaan Otomotif", title: "Platform otomotif, dirancang untuk closing.", url: "autoapp.io/vehicles" },
    { num: "04", type: "Dashboard Analitik SaaS",   title: "Dashboard analitik untuk tim SaaS.",          url: "efferd.app/dashboard" },
  ],
};

const DEMOS = [
  <SafariFrame key="1" url="frameio.app"            ratio="desktop"><VideoAssetManager /></SafariFrame>,
  <SafariFrame key="2" url="caleido.app/dashboard"  ratio="desktop"><CaleidoCrmDashboard /></SafariFrame>,
  <SafariFrame key="3" url="autoapp.io/vehicles"    ratio="desktop"><AutoFinanceDashboard /></SafariFrame>,
  <SafariFrame key="4" url="efferd.app/dashboard"   ratio="desktop"><EfferdDashboard2 /></SafariFrame>,
];

// ─── Arrow Button ─────────────────────────────────────────────────────────────

function ArrowBtn({ dir, onClick, disabled }: { dir: "left" | "right"; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous" : "Next"}
      className="group relative flex h-12 w-12 items-center justify-center"
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,.14), 0 0 28px rgba(255,255,255,.06)" }}
      />
      <span className={`absolute inset-0 rounded-full border transition-colors duration-200 ${
        disabled ? "border-white/[.05] bg-white/[.02]" : "border-white/[.10] bg-white/[.05] group-hover:border-white/[.20] group-hover:bg-white/[.10]"
      }`} />
      <span className={`relative transition-all duration-200 ${disabled ? "text-white/15" : "text-white/50 group-hover:text-white"}`}>
        {dir === "left"
          ? <ChevronLeft  size={20} strokeWidth={1.6} />
          : <ChevronRight size={20} strokeWidth={1.6} />}
      </span>
    </motion.button>
  );
}

// ─── Dot Bar ──────────────────────────────────────────────────────────────────

function DotBar({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="block rounded-full bg-white"
          animate={{ width: i === active ? 18 : 5, opacity: i === active ? 0.9 : 0.22 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          style={{ height: 5 }}
        />
      ))}
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
      <span className="relative grid size-6 place-items-center overflow-hidden" aria-hidden="true">
        <span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" />
        <span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" />
        <span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" />
      </span>
      Scratch Agent
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebProjectsPage() {
  const lang = useLang();
  const [[index, dir], setPage] = useState([0, 0]);
  const meta = (META[lang] ?? META.en)[index];
  const prompt = (PROMPTS[lang] ?? PROMPTS.en)[index];

  const go = useCallback((d: number) => {
    const next = index + d;
    if (next < 0 || next >= DEMOS.length) return;
    setPage([next, d]);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8EDEC]">
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Logo />
          <HeaderNav links={["solutions", "docs"]} ctaHref="/login" ctaKey="login" />
        </div>
      </header>

      <section className="w-full px-3 py-14 md:px-5 md:py-20">

        {/* Arrow pojok | teks berdampingan Safari | arrow pojok */}
        <div className="flex w-full items-center gap-3">

          {/* Arrow pojok kiri */}
          <div className="shrink-0">
            <ArrowBtn dir="left" onClick={() => go(-1)} disabled={index === 0} />
          </div>

          {/* Teks kiri + Safari kanan, tetap berdampingan */}
          <div className="grid min-w-0 flex-1 items-center gap-5 lg:grid-cols-[minmax(235px,300px)_minmax(0,1fr)]">

            {/* Meta + prompt */}
            <div className="min-w-0">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={index}
                  custom={dir}
                  initial={{ opacity: 0, x: dir > 0 ? 18 : -18, filter: "blur(5px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: dir > 0 ? -18 : 18, filter: "blur(5px)" }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">
                    web project {meta.num}
                  </p>
                  <div className="mt-1 text-[15px] font-medium leading-[1.25] tracking-[-.025em] text-[#F0F3F5]">
                    {meta.title}
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-[#5C6A7A]">{meta.type}</p>
                  <div className="mt-4">
                    <DotBar count={DEMOS.length} active={index} />
                  </div>
                  <CopyPrompt prompt={prompt} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Safari frame */}
            <div className="min-w-0">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={index + "-demo"}
                  custom={dir}
                  initial={{ opacity: 0, x: dir > 0 ? 48 : -48, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: dir > 0 ? -48 : 48, filter: "blur(10px)" }}
                  transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {DEMOS[index]}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>

          {/* Arrow pojok kanan */}
          <div className="shrink-0">
            <ArrowBtn dir="right" onClick={() => go(1)} disabled={index === DEMOS.length - 1} />
          </div>

        </div>
      </section>
    </main>
  );
}
