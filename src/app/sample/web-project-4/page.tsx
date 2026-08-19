"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { DemoEfferd } from "@/components/ui/efferd-dashboard-demo";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { useLang } from "@/lib/lang";

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

const PROMPT_EN = `Build a dark-mode analytics dashboard for a SaaS business. Left sidebar with logo, navigation icons (Dashboard, Analytics, Reports, Users, Settings), and user profile at the bottom. Main area: top stats row with 4 KPI cards (Revenue, Active Users, Conversion Rate, Churn Rate) each with trend indicator and sparkline. Below: a revenue line chart spanning 12 months with area fill, and a secondary bar chart for weekly active users. Right panel: recent transactions list with avatar, name, amount, and status badge, plus a top channels breakdown with progress bars. Color scheme: dark (#0f1117) with purple/violet accent (#7c3aed). Stack: React, Tailwind CSS, TypeScript, Recharts or inline SVG for charts.`;

const PROMPT_ID = `Buat dashboard analitik dark-mode untuk bisnis SaaS. Sidebar kiri dengan logo, ikon navigasi (Dashboard, Analytics, Reports, Users, Settings), dan profil pengguna di bawah. Area utama: baris statistik atas dengan 4 kartu KPI (Revenue, Active Users, Conversion Rate, Churn Rate) masing-masing dengan indikator tren dan sparkline. Di bawah: grafik garis revenue 12 bulan dengan area fill, dan grafik batang untuk pengguna aktif mingguan. Panel kanan: daftar transaksi terbaru dengan avatar, nama, jumlah, dan badge status, plus rincian top channel dengan progress bar. Skema warna gelap (#0f1117) dengan aksen ungu (#7c3aed). Stack: React, Tailwind CSS, TypeScript, Recharts atau SVG inline untuk grafik.`;

const FEATURES_EN = [
  "SaaS Analytics Dashboard", "KPI Cards with Trends", "Revenue Line Chart",
  "Weekly Active Users Chart", "Transaction Feed", "Top Channels Breakdown",
];
const FEATURES_ID = [
  "Dashboard Analitik SaaS", "Kartu KPI dengan Tren", "Grafik Garis Revenue",
  "Grafik Pengguna Aktif Mingguan", "Feed Transaksi", "Rincian Top Channel",
];

export default function SampleWebProjectFourPage() {
  const lang = useLang();
  const features = lang === "en" ? FEATURES_EN : FEATURES_ID;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Logo />
          <HeaderNav links={["solutions", "docs"]} ctaHref="/login" ctaKey="login" />
        </div>
      </header>

      <section className="w-full px-6 py-14 md:px-10 md:py-20">
        <div className="sample-project-layout">
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project 04</p>
            <div className="mt-4 max-w-[28ch] text-balance text-[18px] font-medium leading-[1.25] tracking-[-.025em] text-[#F0F3F5]">
              {lang === "en" ? "Analytics dashboard for SaaS teams." : "Dashboard analitik untuk tim SaaS."}
            </div>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
              {lang === "en"
                ? "A data-rich analytics dashboard for SaaS companies. Surfaces revenue trends, user growth, and conversion metrics at a glance — with KPI cards, multi-period charts, a live transaction feed, and channel attribution — all in a compact dark workspace."
                : "Dashboard analitik kaya data untuk perusahaan SaaS. Menampilkan tren revenue, pertumbuhan pengguna, dan metrik konversi sekaligus — dengan kartu KPI, grafik multi-periode, feed transaksi langsung, dan atribusi channel — semuanya dalam workspace gelap yang ringkas."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {features.map(f => (
                <span key={f} className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-[10px] text-[#7A8899]">{f}</span>
              ))}
            </div>

            <CopyPrompt prompt={lang === "en" ? PROMPT_EN : PROMPT_ID} />
          </div>

          <div className="mx-auto w-full max-w-[880px]">
            <DemoEfferd />
          </div>
        </div>
      </section>
    </main>
  );
}
