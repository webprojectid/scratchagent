"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { DemoOne } from "@/components/ui/caleido-crm-demo";
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

const PROMPT_EN = `Build a light-mode CRM sales dashboard called "Caleido". Layout: left sidebar with welcome greeting, 2×3 stat cards (Appointment, Qualified, Presentation, Proposal, Closed Won, Closed Lost), and task progress bars (Calls, To-do, Emails). Center panel: orange gradient banner, activity feed tabs (Activity, Notes, Emails, Calls, Tasks, Meetings), and a vertical timeline of CRM events — deal moves, meeting recordings with audio waveform player, scheduled meetings, and emails. Right panel: contact detail view with profile photo, role badge, action buttons (Meeting, Note, Email, Call, Task), and deal metadata rows. Accent color orange (#ef672f). Stack: React, Tailwind CSS, TypeScript.`;

const PROMPT_ID = `Buat dashboard CRM sales bertema terang bernama "Caleido". Layout: sidebar kiri dengan salam sambutan, grid 2×3 kartu statistik (Appointment, Qualified, Presentation, Proposal, Closed Won, Closed Lost), dan progress bar tugas (Calls, To-do, Emails). Panel tengah: banner gradien oranye, tab activity feed, dan timeline vertikal event CRM — perpindahan deal, rekaman meeting dengan audio waveform, meeting terjadwal, dan email. Panel kanan: tampilan detail kontak dengan foto profil, badge jabatan, tombol aksi, dan baris metadata deal. Warna aksen oranye (#ef672f). Stack: React, Tailwind CSS, TypeScript.`;

const FEATURES_EN = [
  "CRM & Sales Management", "Activity Feed & Timeline", "Deal Pipeline Tracking",
  "Task Progress Bars", "Contact Detail Panel", "Meeting Recording Player",
];
const FEATURES_ID = [
  "CRM & Manajemen Penjualan", "Activity Feed & Timeline", "Pelacakan Pipeline Deal",
  "Progress Bar Tugas", "Panel Detail Kontak", "Pemutar Rekaman Meeting",
];

export default function SampleWebProjectTwoPage() {
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
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project 02</p>
            <h1 className="mt-4 max-w-[22ch] text-balance text-[clamp(1.35rem,2vw,1.8rem)] font-medium leading-[1.02] tracking-[-.05em] text-[#F0F3F5]">
              {lang === "en" ? "CRM dashboard for sales teams." : "Dashboard CRM untuk tim penjualan."}
            </h1>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
              {lang === "en"
                ? "A full-featured sales CRM platform. Manages pipelines, tracks activity history per contact, logs calls and meetings with recordings, monitors daily task completion, and surfaces deal insights — all in a clean three-column workspace."
                : "Platform CRM penjualan berfitur lengkap. Mengelola pipeline, melacak riwayat aktivitas per kontak, mencatat panggilan dan meeting dengan rekaman, memantau penyelesaian tugas harian, dan menampilkan insight deal — semuanya dalam workspace tiga kolom yang bersih."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {features.map(f => (
                <span key={f} className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-[10px] text-[#7A8899]">{f}</span>
              ))}
            </div>

            <CopyPrompt prompt={lang === "en" ? PROMPT_EN : PROMPT_ID} />
          </div>

          <div className="mx-auto w-full max-w-[880px]">
            <DemoOne />
          </div>
        </div>
      </section>
    </main>
  );
}
