"use client";

import { LandingNavbar } from "@/components/landing-navbar";
import { SafariFrame } from "@/components/ui/safari-browser-frame";
import { VideoAssetManager } from "@/components/ui/video-asset-manager";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { useLang } from "@/lib/lang";


const PROMPT_EN = `Build a dark-themed video asset management dashboard for a film production team. Include a left sidebar with asset collections (Key Scenes, Episodes, Locations) and nested folders. Main area shows a 2×4 grid of video thumbnails with filename, uploader, date, duration badge, and status tag. Add a top breadcrumb bar with search, user avatar, and notification icons. Controls bar with sort, view toggle (grid/list), and tab filters (Appearance, Fields, Validate). Dark navy color scheme (#0d1117). Stack: React, Tailwind CSS, TypeScript.`;

const PROMPT_ID = `Buat dashboard manajemen aset video bertema gelap untuk tim produksi film. Sertakan sidebar kiri dengan koleksi aset (Key Scenes, Episodes, Locations) dan folder bertingkat. Area utama menampilkan grid 2×4 thumbnail video lengkap dengan nama file, uploader, tanggal, badge durasi, dan tag status. Tambahkan top bar breadcrumb dengan pencarian, avatar pengguna, dan ikon notifikasi. Controls bar dengan sort, toggle tampilan (grid/list), dan filter tab. Skema warna navy gelap (#0d1117). Stack: React, Tailwind CSS, TypeScript.`;


export default function SampleWebProjectPage() {
  const lang = useLang();

  return (
    <main className="sample-page min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      <LandingNavbar />

      <section className="w-full px-6 py-14 md:px-10 md:py-20">
        <div className="sample-project-layout">
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project 01</p>
            <div className="mt-4 max-w-[28ch] text-balance text-[18px] font-medium leading-[1.25] tracking-[-.025em] text-[#F0F3F5]">
              {lang === "en" ? "Video asset manager for film teams." : "Manajemen aset video untuk tim film."}
            </div>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
              {lang === "en"
                ? "A production-grade video asset management platform. Built for film crews and post-production teams to organize, review, and tag dailies, key scenes, and episode footage — all in one dark-mode workspace."
                : "Platform manajemen aset video skala produksi. Dirancang untuk kru film dan tim pasca produksi agar dapat mengorganisir, mereview, dan menandai rekaman harian, adegan kunci, dan footage episode — semuanya dalam satu workspace dark-mode."}
            </p>

            <CopyPrompt prompt={lang === "en" ? PROMPT_EN : PROMPT_ID} />
          </div>

          <div className="mx-auto w-full max-w-[880px]">
            <SafariFrame url="studio.lapis.app/video-assets" ratio="desktop">
              <VideoAssetManager />
            </SafariFrame>
          </div>
        </div>
      </section>
    </main>
  );
}
