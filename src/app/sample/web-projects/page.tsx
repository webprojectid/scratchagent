"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/lang";
import { HeaderNav } from "@/components/header-nav";

// ─── Project data ─────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    number: "01",
    slug: "/sample/web-project",
    type: { en: "Video Asset Management", id: "Manajemen Aset Video" },
    title: { en: "Video asset manager for film teams.", id: "Manajemen aset video untuk tim film." },
    desc: {
      en: "A production-grade video asset management platform for film crews and post-production teams to organize, review, and tag dailies, key scenes, and episode footage.",
      id: "Platform manajemen aset video skala produksi untuk kru film dan tim pasca produksi agar dapat mengorganisir, mereview, dan menandai rekaman harian, adegan kunci, dan footage episode.",
    },
    accent: "#38bdf8",
    bg: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(56,189,248,.12) 0%, transparent 70%)",
  },
  {
    number: "02",
    slug: "/sample/web-project-2",
    type: { en: "CRM & Sales Dashboard", id: "Dashboard CRM & Penjualan" },
    title: { en: "CRM dashboard for sales teams.", id: "Dashboard CRM untuk tim penjualan." },
    desc: {
      en: "A full-featured sales CRM platform. Manages pipelines, tracks activity history per contact, logs calls and meetings with recordings, and monitors daily task completion.",
      id: "Platform CRM penjualan berfitur lengkap. Mengelola pipeline, melacak riwayat aktivitas per kontak, mencatat panggilan dan meeting, dan memantau penyelesaian tugas harian.",
    },
    accent: "#f97316",
    bg: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(249,115,22,.12) 0%, transparent 70%)",
  },
  {
    number: "03",
    slug: "/sample/web-project-3",
    type: { en: "Auto Finance Platform", id: "Platform Pembiayaan Otomotif" },
    title: { en: "Auto finance platform, built to close.", id: "Platform otomotif, dirancang untuk closing." },
    desc: {
      en: "A full vehicle purchase and financing interface for auto dealerships. Buyers browse specs, flip through photo galleries, review financing breakdown, and contact the dealer.",
      id: "Antarmuka pembelian dan pembiayaan kendaraan lengkap untuk dealer otomotif. Pembeli jelajahi spesifikasi, galeri foto, rincian pembiayaan, dan hubungi dealer.",
    },
    accent: "#4ade80",
    bg: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(74,222,128,.10) 0%, transparent 70%)",
  },
  {
    number: "04",
    slug: "/sample/web-project-4",
    type: { en: "SaaS Analytics Dashboard", id: "Dashboard Analitik SaaS" },
    title: { en: "Analytics dashboard for SaaS teams.", id: "Dashboard analitik untuk tim SaaS." },
    desc: {
      en: "A data-rich analytics dashboard for SaaS companies. Surfaces revenue trends, user growth, and conversion metrics — with KPI cards, charts, a transaction feed, and channel attribution.",
      id: "Dashboard analitik kaya data untuk perusahaan SaaS. Menampilkan tren revenue, pertumbuhan pengguna, dan metrik konversi dengan kartu KPI, grafik, dan atribusi channel.",
    },
    accent: "#a78bfa",
    bg: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(167,139,250,.12) 0%, transparent 70%)",
  },
];

// ─── Arrow Button ─────────────────────────────────────────────────────────────

function ArrowBtn({ dir, onClick, disabled }: { dir: "left" | "right"; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex h-14 w-14 items-center justify-center"
      whileHover={disabled ? {} : { scale: 1.08 }}
      whileTap={disabled ? {} : { scale: 0.94 }}
    >
      {/* Outer glow ring */}
      <motion.span
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,.15), 0 0 24px rgba(255,255,255,.06)" }}
      />
      {/* Background fill */}
      <span className={`absolute inset-0 rounded-full border border-white/[.09] transition-colors duration-200 ${disabled ? "bg-white/[.03]" : "bg-white/[.06] group-hover:bg-white/[.11]"}`} />
      {/* Icon */}
      <span className={`relative transition-all duration-200 ${disabled ? "text-white/20" : "text-white/60 group-hover:text-white"}`}>
        {dir === "left" ? <ChevronLeft size={22} strokeWidth={1.8} /> : <ChevronRight size={22} strokeWidth={1.8} />}
      </span>
    </motion.button>
  );
}

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="block rounded-full bg-white"
          animate={{ width: i === active ? 20 : 6, opacity: i === active ? 1 : 0.25 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ height: 6 }}
        />
      ))}
    </div>
  );
}

// ─── Slide variants ───────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(8px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    filter: "blur(8px)",
  }),
};

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
      <span className="relative grid size-6 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true">
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
  const router = useRouter();
  const [[index, dir], setPage] = useState([0, 0]);
  const project = PROJECTS[index];

  const go = useCallback((newDir: number) => {
    const next = index + newDir;
    if (next < 0 || next >= PROJECTS.length) return;
    setPage([next, newDir]);
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <main className="flex min-h-screen flex-col bg-[#0A0A0A] text-[#E8EDEC]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Logo />
          <HeaderNav links={["solutions", "docs"]} ctaHref="/login" ctaKey="login" />
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">

        {/* Ambient glow bg */}
        <motion.div
          className="pointer-events-none fixed inset-0"
          animate={{ background: project.bg }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />

        <div className="relative z-10 w-full max-w-[760px]">

          {/* Top — number + type */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={index + "-meta"}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mb-6 flex items-center gap-3"
            >
              <span className="font-mono text-[11px] tracking-[.2em] text-white/30">{project.number} / {String(PROJECTS.length).padStart(2,"0")}</span>
              <span className="h-px flex-1 bg-white/[.07]" />
              <span className="rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[.16em]"
                style={{ borderColor: project.accent + "40", color: project.accent }}>
                {lang === "en" ? project.type.en : project.type.id}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Title + description */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={index + "-copy"}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.04 }}
            >
              <div className="max-w-[26ch] text-[clamp(1.45rem,2.4vw,2.1rem)] font-medium leading-[1.2] tracking-[-.035em] text-[#F0F3F5]">
                {lang === "en" ? project.title.en : project.title.id}
              </div>
              <p className="mt-4 max-w-[48ch] text-[13px] leading-[1.7] text-[#6B7A8D]">
                {lang === "en" ? project.desc.en : project.desc.id}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* CTA */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={index + "-cta"}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.08 }}
              className="mt-8"
            >
              <motion.button
                onClick={() => router.push(project.slug)}
                className="group flex items-center gap-2 rounded-full border px-5 py-2.5 text-[12px] font-medium transition-colors"
                style={{ borderColor: project.accent + "50", color: project.accent, backgroundColor: project.accent + "10" }}
                whileHover={{ scale: 1.04, backgroundColor: project.accent + "1a" }}
                whileTap={{ scale: 0.97 }}
              >
                {lang === "en" ? "View sample" : "Lihat sample"}
                <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.button>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-14 flex items-center gap-6">
            <ArrowBtn dir="left" onClick={() => go(-1)} disabled={index === 0} />
            <Dots count={PROJECTS.length} active={index} />
            <ArrowBtn dir="right" onClick={() => go(1)} disabled={index === PROJECTS.length - 1} />
          </div>

        </div>
      </div>
    </main>
  );
}
