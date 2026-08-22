"use client";

import React from "react";
import { motion } from "motion/react";
import Image from "next/image";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "A tricky multi-service architecture bugfix stumped Cursor and Claude Code. Scratch Agent broke down the tasks with strict DAG dependencies, and our team shipped the entire MVP in one evening.",
    name: "Reza Aditya",
    role: "Founder @ DevHouse Jakarta",
    avatar: "/avatars/reza.jpg",
  },
  {
    quote:
      "Setelah pakai beberapa hari, Scratch Agent jauh lebih stabil untuk project skala menengah ke atas. PRD Blueprint-nya rapi banget dan diagram arsitektur Mermaid-nya langsung nyambung ke task koding.",
    name: "Anisa Rahmawati",
    role: "Tech Lead @ Fintech Nusantara",
    avatar: "/avatars/anisa.jpg",
  },
  {
    quote:
      "Fitur auto-breakdown fase dengan dependency graph-nya gila sih. Agent terminal kayak Claude Code dan Qwen tinggal baca Master Prompt dan langsung eksekusi task demi task tanpa halusinasi.",
    name: "Fajar Pratama",
    role: "Senior Fullstack Engineer",
    avatar: "/avatars/fajar.jpg",
  },
  {
    quote:
      "Biasanya bikin PRD dan task board butuh waktu berhari-hari. Di Scratch Agent tinggal masukin brief 2 kalimat, langsung keluar struktur lengkap dari frontend, backend, sampai QA test.",
    name: "Dini Maharani",
    role: "Product Designer & Indie Maker",
    avatar: "/avatars/dini.jpg",
  },
  {
    quote:
      "Struktur skema database dan relasi antar task-nya beneran rock-solid. Di setiap project, spesifikasi teknisnya sangat detail sehingga eksekusi agent koding selalu presisi.",
    name: "Budi Santoso",
    role: "Backend Architect @ Surabaya",
    avatar: "/avatars/reza.jpg",
  },
  {
    quote:
      "Export master prompt ke Cline dan Cursor langsung jalan tanpa missing context. Dari alur otentikasi sampai sinkronisasi Cloud terdefinisi jelas tanpa tebak-tebakan.",
    name: "Siti Nurhaliza",
    role: "Software Engineer @ Bandung",
    avatar: "/avatars/anisa.jpg",
  },
];

export function TestimonialsSection() {
  const repeatedTestimonials = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="relative mx-auto w-full max-w-[1360px] overflow-hidden px-5 py-20 md:px-10 md:py-28" aria-label="User Testimonials">
      {/* Header Section matching screenshot layout */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-[560px]">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#74FA6A]">
            Community & Developers
          </p>
          <h2 className="mt-3 text-balance text-[clamp(1.8rem,3.2vw,2.75rem)] font-semibold leading-[1.12] tracking-[-.04em] text-[#F0F3F5]">
            Explore a new way of working with agents alongside thousands of developers.
          </h2>
        </div>
        <div className="max-w-[320px] text-left md:text-right">
          <p className="text-[14px] leading-relaxed text-[#8C97A5]">
            Real feedback from developers & creators building with Scratch Agent.
          </p>
        </div>
      </div>

      {/* Testimonials Marquee Track */}
      <div className="relative mt-12 w-full overflow-hidden">
        {/* Soft edge blur gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0A0A0A] to-transparent md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0A0A0A] to-transparent md:w-32" />

        <div className="flex w-max gap-5 py-4 animate-marquee hover:[animation-play-state:paused]">
          {repeatedTestimonials.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="group relative flex w-[360px] md:w-[400px] shrink-0 flex-col justify-between overflow-hidden rounded-[22px] border border-white/[0.1] bg-gradient-to-b from-[#161B22]/90 via-[#11151B]/80 to-[#0D1014]/90 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.22] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_20px_45px_-10px_rgba(0,0,0,0.75)]"
            >
              {/* Gloss highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transition-opacity duration-300 group-hover:via-white/50" />

              {/* Quote Text */}
              <p className="text-[14.5px] leading-[1.65] text-[#D1D5DB] transition-colors group-hover:text-white">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Author Row with Indonesian Portrait Photo */}
              <div className="mt-6 flex items-center gap-3.5 border-t border-white/[0.08] pt-4">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-white/[0.2] shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={44}
                    height={44}
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[14.5px] font-semibold text-white">
                    {item.name}
                  </h4>
                  <p className="truncate text-[12px] text-[#8C97A5]">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
