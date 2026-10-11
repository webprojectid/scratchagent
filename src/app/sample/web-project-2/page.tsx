"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { DemoOne } from "@/components/ui/caleido-crm-demo";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { useLang } from "@/lib/lang";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-foreground">
      <span className="relative grid size-6 place-items-center overflow-hidden text-primary" aria-hidden="true">
        <span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" />
        <span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" />
        <span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" />
      </span>
      Scratch Agent
    </Link>
  );
}

const PROMPT_EN = `Build a light-mode CRM sales dashboard called "Caleido". Layout: left sidebar with welcome greeting, 2×3 stat cards (Appointment, Qualified, Presentation, Proposal, Closed Won, Closed Lost), and task progress bars (Calls, To-do, Emails). Center panel: green banner, activity feed tabs (Activity, Notes, Emails, Calls, Tasks, Meetings), and a vertical timeline of CRM events — deal moves, meeting recordings with audio waveform player, scheduled meetings, and emails. Right panel: contact detail view with profile photo, role badge, action buttons (Meeting, Note, Email, Call, Task), and deal metadata rows. Accent color Scratch Green (#267a36). Stack: React, Tailwind CSS, TypeScript.`;

const PROMPT_ID = `Buat dashboard CRM sales bertema terang bernama "Caleido". Layout: sidebar kiri dengan salam sambutan, grid 2×3 kartu statistik (Appointment, Qualified, Presentation, Proposal, Closed Won, Closed Lost), dan progress bar tugas (Calls, To-do, Emails). Panel tengah: banner hijau, tab activity feed, dan timeline vertikal event CRM — perpindahan deal, rekaman meeting dengan audio waveform, meeting terjadwal, dan email. Panel kanan: tampilan detail kontak dengan foto profil, badge jabatan, tombol aksi, dan baris metadata deal. Warna aksen Scratch Green (#267a36). Stack: React, Tailwind CSS, TypeScript.`;


export default function SampleWebProjectTwoPage() {
  const lang = useLang();

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,_var(--theme-bg)_85%,_transparent)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Logo />
          <HeaderNav links={["solutions", "docs"]} ctaHref="/login" ctaKey="login" />
        </div>
      </header>

      <section className="w-full px-6 py-14 md:px-10 md:py-20">
        <div className="sample-project-layout">
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">web project 02</p>
            <div className="mt-4 max-w-[28ch] text-balance text-[18px] font-medium leading-[1.25] tracking-[-.025em] text-foreground">
              {lang === "en" ? "CRM dashboard for sales teams." : "Dashboard CRM untuk tim penjualan."}
            </div>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-muted-foreground">
              {lang === "en"
                ? "A full-featured sales CRM platform. Manages pipelines, tracks activity history per contact, logs calls and meetings with recordings, monitors daily task completion, and surfaces deal insights — all in a clean three-column workspace."
                : "Platform CRM penjualan berfitur lengkap. Mengelola pipeline, melacak riwayat aktivitas per kontak, mencatat panggilan dan meeting dengan rekaman, memantau penyelesaian tugas harian, dan menampilkan insight deal — semuanya dalam workspace tiga kolom yang bersih."}
            </p>

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
