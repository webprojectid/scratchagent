"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, useAnimationControls } from "motion/react";
import { ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";

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
      "Struktur skema database Room SQLite dan sinkronisasi Cloud Supabase-nya beneran rock-solid. Di setiap project, spesifikasi teknisnya sangat detail sehingga eksekusi agent koding selalu presisi.",
    name: "Gilang Ramadhan",
    role: "Cloud & DevOps Architect @ Yogyakarta",
    avatar: "/avatars/gilang.jpg",
  },
  {
    quote:
      "Paling suka bagian validasi DAG anti-circular dependencies-nya. Waktu agent AI jalanin 100+ task, urutan eksekusinya urut logis dan gak pernah nyangkut di tengah jalan.",
    name: "Maya Putri",
    role: "AI/ML Engineer & Researcher",
    avatar: "/avatars/maya.jpg",
  },
  {
    quote:
      "Export master prompt ke Cline, Cursor, dan Aider CLI langsung jalan tanpa missing context. Dari alur otentikasi sampai sinkronisasi Cloud terdefinisi jelas tanpa tebak-tebakan.",
    name: "Arya Kusuma",
    role: "Mobile Application Architect @ Bali",
    avatar: "/avatars/arya.jpg",
  },
  {
    quote:
      "Sebagai solo builder, Scratch Agent beneran jadi co-founder teknis. Mulai dari ide mentah di chat langsung ditransformasikan jadi fase koding lengkap yang siap dieksekusi.",
    name: "Budi Santoso",
    role: "Backend Architect @ Surabaya",
    avatar: "/avatars/reza.jpg",
  },
  {
    quote:
      "Hemat waktu riset berjam-jam saat nentuin arsitektur Next.js 14 dan database relational. Hasil PRD-nya siap diajukan ke klien dan langsung siap dikerjakan tim engineer.",
    name: "Siti Nurhaliza",
    role: "Software Engineer @ Bandung",
    avatar: "/avatars/anisa.jpg",
  },
];

export function TestimonialsSection() {
  const [isPaused, setIsPaused] = useState(false);
  const repeatedTestimonials = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="relative mx-auto w-full max-w-[1360px] overflow-hidden px-5 py-20 md:px-10 md:py-28" aria-label="User Testimonials">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(116,250,106,0.05),transparent_70%)] blur-3xl" />

      {/* Header Section matching screenshot layout */}
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-[620px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1 text-[11px] font-medium tracking-wide text-[#A9C5A7] backdrop-blur-xl">
            <MessageSquareQuote size={13} className="text-[#74FA6A]" />
            Community & Developer Reviews
          </div>
          <h2 className="mt-3.5 text-balance text-[clamp(1.85rem,3.4vw,2.9rem)] font-semibold leading-[1.1] tracking-[-.045em] text-[#F0F3F5]">
            Explore a new way of working with agents alongside thousands of developers.
          </h2>
        </div>

        <div className="max-w-[340px] text-left md:text-right">
          <p className="text-[14px] leading-relaxed text-[#8C97A5]">
            Real feedback from developers & creators building with Scratch Agent.
          </p>
        </div>
      </div>

      {/* Hardware-Accelerated Auto-Slider with Motion Loop */}
      <div
        className="relative mt-12 w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Soft edge blur gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-[#0A0A0A] to-transparent md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-[#0A0A0A] to-transparent md:w-32" />

        <motion.div
          className="flex w-max gap-5 py-4 cursor-grab active:cursor-grabbing"
          animate={isPaused ? {} : { x: ["0%", "-33.333%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 36,
              ease: "linear",
            },
          }}
        >
          {repeatedTestimonials.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="group relative flex w-[350px] sm:w-[380px] md:w-[420px] shrink-0 flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.12] bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-6 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_14px_36px_-8px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/[0.28] hover:bg-white/[0.09] hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.35),0_20px_50px_-10px_rgba(0,0,0,0.7)]"
            >
              {/* Top Gloss Highlight (iOS Glass Specular) */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent transition-opacity duration-300 group-hover:via-white/60" />

              {/* Quote Text */}
              <p className="text-[14px] sm:text-[14.5px] leading-[1.65] text-[#D1D5DB] transition-colors group-hover:text-white">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Author Row with Indonesian Portrait Photo */}
              <div className="mt-6 flex items-center gap-3.5 border-t border-white/[0.08] pt-4.5">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-white/[0.22] shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={44}
                    height={44}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[14.5px] font-semibold text-white">
                    {item.name}
                  </h4>
                  <p className="truncate text-[12px] text-[#8C97A5] transition-colors group-hover:text-[#A1A1AA]">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
