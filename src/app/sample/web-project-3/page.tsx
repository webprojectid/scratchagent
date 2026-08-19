"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { DemoSaas } from "@/components/ui/auto-finance-demo";
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

const PROMPT_EN = `Build a vehicle purchase and financing web app on a dark navy gradient background. Top nav with logo, Vehicles / Application / Profile links and Help / Logout. Main content in a white card: vehicle header showing year/make/model, a heart icon, key specs (mileage, transmission, MPG, fuel) in columns, monthly payment price, and a Select CTA button. Below: left column with an interactive image gallery (main photo + 4 thumbnails + prev/next arrows) and collapsible accordion sections (Vehicle Overview with full spec list, Features, Safety). Right column with a Financing breakdown table (sales price, fees, warranty, GAP, cash price, trade, rebate, down payment, loan balance, term, APR, fine print) and a Dealer Info card (name, address, phone, email, Contact Dealer button). Stack: React, Tailwind CSS, TypeScript.`;

const PROMPT_ID = `Buat aplikasi web pembelian dan pembiayaan kendaraan dengan latar gradien navy gelap. Navbar atas dengan logo, tautan Vehicles / Application / Profile, dan Help / Logout. Konten utama dalam kartu putih: header kendaraan menampilkan tahun/merek/model, ikon hati, spesifikasi utama (mileage, transmisi, MPG, bahan bakar) dalam kolom, harga cicilan bulanan, dan tombol Select. Di bawah: kolom kiri dengan galeri gambar interaktif (foto utama + 4 thumbnail + tombol prev/next) dan section accordion (Vehicle Overview dengan daftar spek lengkap, Features, Safety). Kolom kanan dengan tabel rincian Pembiayaan dan kartu Informasi Dealer. Stack: React, Tailwind CSS, TypeScript.`;

const FEATURES_EN = [
  "Auto Finance Platform", "Vehicle Purchase Flow", "Interactive Image Gallery",
  "Financing Breakdown Table", "Spec Accordion Sections", "Dealer Contact Card",
];
const FEATURES_ID = [
  "Platform Pembiayaan Otomotif", "Alur Pembelian Kendaraan", "Galeri Gambar Interaktif",
  "Tabel Rincian Pembiayaan", "Accordion Spesifikasi", "Kartu Kontak Dealer",
];

export default function SampleWebProjectThreePage() {
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
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project 03</p>
            <h1 className="mt-4 max-w-[22ch] text-balance text-[clamp(1.35rem,2vw,1.8rem)] font-medium leading-[1.02] tracking-[-.05em] text-[#F0F3F5]">
              {lang === "en" ? "Auto finance platform, built to close." : "Platform otomotif, dirancang untuk closing."}
            </h1>

            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
              {lang === "en"
                ? "A full vehicle purchase and financing interface for auto dealerships. Buyers can browse vehicle specs, flip through photo galleries, review a complete financing breakdown with APR and loan terms, and contact the dealer — all in a single guided flow."
                : "Antarmuka pembelian dan pembiayaan kendaraan lengkap untuk dealer otomotif. Pembeli dapat menjelajahi spesifikasi kendaraan, melihat galeri foto, meninjau rincian pembiayaan lengkap dengan APR dan tenor, serta menghubungi dealer — semua dalam satu alur yang terarah."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {features.map(f => (
                <span key={f} className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-[10px] text-[#7A8899]">{f}</span>
              ))}
            </div>

            <CopyPrompt prompt={lang === "en" ? PROMPT_EN : PROMPT_ID} />
          </div>

          <div className="mx-auto w-full max-w-[880px]">
            <DemoSaas />
          </div>
        </div>
      </section>
    </main>
  );
}
