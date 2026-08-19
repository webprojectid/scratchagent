"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { SafariFrame } from "@/components/ui/safari-browser-frame";
import { VideoAssetManager } from "@/components/ui/video-asset-manager";
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

const PROMPT_EN = `Build a dark-themed video asset management dashboard for a film production team. Include a left sidebar with asset collections (Key Scenes, Episodes, Locations) and nested folders. Main area shows a 2×4 grid of video thumbnails with filename, uploader, date, duration badge, and status tag. Add a top breadcrumb bar with search, user avatar, and notification icons. Controls bar with sort, view toggle (grid/list), and tab filters (Appearance, Fields, Validate). Dark navy color scheme (#0d1117). Stack: React, Tailwind CSS, TypeScript.`;

const PROMPT_ID = `Buat dashboard manajemen aset video bertema gelap untuk tim produksi film. Sertakan sidebar kiri dengan koleksi aset (Key Scenes, Episodes, Locations) dan folder bertingkat. Area utama menampilkan grid 2×4 thumbnail video lengkap dengan nama file, uploader, tanggal, badge durasi, dan tag status. Tambahkan top bar breadcrumb dengan pencarian, avatar pengguna, dan ikon notifikasi. Controls bar dengan sort, toggle tampilan (grid/list), dan filter tab. Skema warna navy gelap (#0d1117). Stack: React, Tailwind CSS, TypeScript.`;

const FEATURES_EN = [
  "Video Asset Management", "Film & Post-Production", "Grid + List View Toggle",
  "Asset Tagging & Status", "Sidebar Collections", "Search & Filter",
];
const FEATURES_ID = [
  "Manajemen Aset Video", "Film & Pasca Produksi", "Tampilan Grid + List",
  "Tag Aset & Status", "Koleksi Sidebar", "Pencarian & Filter",
];

export default function SampleWebProjectPage() {
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
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project 01</p>
            <h1 className="mt-4 max-w-[22ch] text-balance text-[clamp(2rem,3.6vw,3.1rem)] font-medium leading-[1.02] tracking-[-.05em] text-[#F0F3F5]">
              {lang === "en" ? "Video asset manager for film teams." : "Manajemen aset video untuk tim film."}
            </h1>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
              {lang === "en"
                ? "A production-grade video asset management platform. Built for film crews and post-production teams to organize, review, and tag dailies, key scenes, and episode footage — all in one dark-mode workspace."
                : "Platform manajemen aset video skala produksi. Dirancang untuk kru film dan tim pasca produksi agar dapat mengorganisir, mereview, dan menandai rekaman harian, adegan kunci, dan footage episode — semuanya dalam satu workspace dark-mode."}
            </p>

            {/* Feature tags */}
            <div className="mt-6 flex flex-wrap gap-2">
              {features.map(f => (
                <span key={f} className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-[10px] text-[#7A8899]">{f}</span>
              ))}
            </div>

            <CopyPrompt prompt={lang === "en" ? PROMPT_EN : PROMPT_ID} />
          </div>

          <div className="mx-auto w-full max-w-[880px]">
            <SafariFrame url="frameio.app" ratio="desktop">
              <VideoAssetManager />
            </SafariFrame>
          </div>
        </div>
      </section>
    </main>
  );
}
