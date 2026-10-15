"use client";

import { LandingNavbar } from "@/components/landing-navbar";
import { DemoOne } from "@/components/ui/caleido-crm-demo";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { useLang } from "@/lib/lang";


const PROMPT_EN = `Build a light-mode CRM sales dashboard called "Caleido". Layout: left sidebar with welcome greeting, 2×3 stat cards (Appointment, Qualified, Presentation, Proposal, Closed Won, Closed Lost), and task progress bars (Calls, To-do, Emails). Center panel: orange gradient banner, activity feed tabs (Activity, Notes, Emails, Calls, Tasks, Meetings), and a vertical timeline of CRM events — deal moves, meeting recordings with audio waveform player, scheduled meetings, and emails. Right panel: contact detail view with profile photo, role badge, action buttons (Meeting, Note, Email, Call, Task), and deal metadata rows. Accent color orange (#ef672f). Stack: React, Tailwind CSS, TypeScript.`;

const PROMPT_ID = `Buat dashboard CRM sales bertema terang bernama "Caleido". Layout: sidebar kiri dengan salam sambutan, grid 2×3 kartu statistik (Appointment, Qualified, Presentation, Proposal, Closed Won, Closed Lost), dan progress bar tugas (Calls, To-do, Emails). Panel tengah: banner gradien oranye, tab activity feed, dan timeline vertikal event CRM — perpindahan deal, rekaman meeting dengan audio waveform, meeting terjadwal, dan email. Panel kanan: tampilan detail kontak dengan foto profil, badge jabatan, tombol aksi, dan baris metadata deal. Warna aksen oranye (#ef672f). Stack: React, Tailwind CSS, TypeScript.`;


export default function SampleWebProjectTwoPage() {
  const lang = useLang();

  return (
    <main className="sample-page min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      <LandingNavbar />

      <section className="w-full px-6 py-14 md:px-10 md:py-20">
        <div className="sample-project-layout">
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project 02</p>
            <div className="mt-4 max-w-[28ch] text-balance text-[18px] font-medium leading-[1.25] tracking-[-.025em] text-[#F0F3F5]">
              {lang === "en" ? "CRM dashboard for sales teams." : "Dashboard CRM untuk tim penjualan."}
            </div>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
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
