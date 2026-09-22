"use client";

import React from "react";
import Image from "next/image";

interface Testimonial {
  quoteId: string;
  name: string;
  role: string;
  avatar: string;
}

// Bilingual testimonials - English version first (default), Indonesian fallback
const TESTIMONIALS: Testimonial[] = [
  {
    quoteId: "reza",
    name: "Reza Aditya",
    role: "Founder @ DevHouse Jakarta",
    avatar: "/avatars/reza-v2.jpg",
  },
  {
    quoteId: "anisa",
    name: "Anisa Rahmawati",
    role: "Tech Lead @ Fintech Nusantara",
    avatar: "/avatars/anisa-v2.jpg",
  },
  {
    quoteId: "fajar",
    name: "Fajar Pratama",
    role: "Senior Fullstack Engineer",
    avatar: "/avatars/fajar-v2.jpg",
  },
  {
    quoteId: "dini",
    name: "Dini Maharani",
    role: "Product Designer & Indie Maker",
    avatar: "/avatars/dini-v2.jpg",
  },
  {
    quoteId: "gilang",
    name: "Gilang Ramadhan",
    role: "Cloud & DevOps Architect @ Yogyakarta",
    avatar: "/avatars/gilang-v2.jpg",
  },
  {
    quoteId: "maya",
    name: "Maya Putri",
    role: "AI/ML Engineer & Researcher",
    avatar: "/avatars/maya-v2.jpg",
  },
  {
    quoteId: "arya",
    name: "Arya Kusuma",
    role: "Mobile Application Architect @ Bali",
    avatar: "/avatars/arya-v2.jpg",
  },
  {
    quoteId: "budi",
    name: "Budi Santoso",
    role: "Backend Architect @ Surabaya",
    avatar: "/avatars/budi-v2.jpg",
  },
  {
    quoteId: "siti",
    name: "Siti Nurhaliza",
    role: "Software Engineer @ Bandung",
    avatar: "/avatars/siti-v2.jpg",
  },
];

export function TestimonialsSection({ lang = "id" }: { lang?: "id" | "en" }) {
  const en = lang === "en";
  
  // Bilingual quotes
  const quotes: Record<string, string> = {
    reza: en 
      ? "Bugfixing the tricky multi-service architecture left Cursor and Claude Code stuck. Scratch Agent broke down tasks with a strict dependency DAG—we shipped a complete MVP in one night."
      : "Bugfix arsitektur multi-service yang tricky bikin Cursor dan Claude Code mentok. Scratch Agent nge-breakdown task-nya dengan dependency DAG ketat, tim kami rilis MVP utuh dalam satu malam.",
    
    anisa: en
      ? "After using it for a few days, Scratch Agent is far more stable for medium-to-large projects. The PRD Blueprint is super clean and the Mermaid architecture diagrams connect directly to coding tasks."
      : "Setelah pakai beberapa hari, Scratch Agent jauh lebih stabil untuk project skala menengah ke atas. PRD Blueprint-nya rapi banget dan diagram arsitektur Mermaid-nya langsung nyambung ke task koding.",
    
    fajar: en
      ? "The auto-phase breakdown feature with its dependency graph is insane. Agent terminals like Claude Code and Qwen just read the Master Prompt and execute tasks one by one without hallucinating."
      : "Fitur auto-breakdown fase dengan dependency graph-nya gila sih. Agent terminal kayak Claude Code dan Qwen tinggal baca Master Prompt dan langsung eksekusi task demi task tanpa halusinasi.",
    
    dini: en
      ? "Normally creating PRDs and task boards takes days. With Scratch Agent, I just type a 2-line brief and get a full structure covering frontend, backend, all the way to QA testing."
      : "Biasanya bikin PRD dan task board butuh waktu berhari-hari. Di Scratch Agent tinggal masukin brief 2 kalimat, langsung keluar struktur lengkap dari frontend, backend, sampai QA test.",
    
    gilang: en
      ? "The SQLite Room database schema structure and Supabase Cloud sync integration are rock-solid. Every project has extremely detailed technical specs so agent coding execution is always precise."
      : "Struktur skema database Room SQLite dan sinkronisasi Cloud Supabase-nya beneran rock-solid. Di setiap project, spesifikasi teknisnya sangat detail sehingga eksekusi agent koding selalu presisi.",
    
    maya: en
      ? "I love the anti-circular dependency validation DAG most. When AI agents ran 100+ tasks, the execution order was logically sorted and never got stuck halfway."
      : "Paling suka bagian validasi DAG anti-circular dependencies-nya. Waktu agent AI jalanin 100+ task, urutan eksekusinya urut logis dan gak pernah nyangkut di tengah jalan.",
    
    arya: en
      ? "Exporting master prompts to Cline, Cursor, and Aider CLI works immediately without missing context. From auth flow to Cloud synchronization, everything's clearly defined without guessing."
      : "Export master prompt ke Cline, Cursor, dan Aider CLI langsung jalan tanpa missing context. Dari alur auth sampai sinkronisasi Cloud terdefinisi jelas tanpa tebak-tebakan.",
    
    budi: en
      ? "As a solo builder, Scratch Agent truly acts as my technical co-founder. Raw ideas typed in chat instantly transform into complete coding phases ready for execution."
      : "Sebagai solo builder, Scratch Agent beneran jadi co-founder teknis. Mulai dari ide mentah di chat langsung ditransformasikan jadi fase koding lengkap yang siap dieksekusi.",
    
    siti: en
      ? "Saved hours of research on Next.js 14 architecture and relational database decisions. The resulting PRD is presentation-ready for clients and ready for engineering teams to work on."
      : "Hemat waktu riset berjam-jam saat nentuin arsitektur Next.js 14 dan database relational. Hasil PRD-nya siap diajukan ke klien dan langsung siap dikerjakan tim engineer.",
  };

  const repeatedTestimonials = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="relative mx-auto w-full max-w-[1360px] overflow-hidden px-5 py-20 md:px-10 md:py-28" aria-label="User Testimonials">
      {/* Header Section matching screenshot layout */}
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-[620px]">
          <h2 className="text-balance text-[clamp(1.85rem,3.4vw,2.9rem)] font-semibold leading-[1.1] tracking-[-.045em] text-[#F0F3F5]">
            {en ? "Explore a new way to work with agents." : "Jelajahi cara baru bekerja bareng agent."}
          </h2>
        </div>

        <div className="max-w-[340px] text-left md:text-right">
          <p className="text-[14px] leading-relaxed text-[#8C97A5]">
            {en ? "Real feedback from developers and creators building with Scratch Agent." : "Feedback asli dari developer dan creator yang membangun dengan Scratch Agent."}
          </p>
        </div>
      </div>

      {/* Hardware-Accelerated Auto-Slider: pure CSS animation so hover-pause
          freezes mid-track (no snap-back) and resumes from the same pixel. */}
      <div
        className="testimonials-track relative mt-12 w-full overflow-hidden"
      >
        {/* Soft edge blur gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-[#0A0A0A] to-transparent md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-[#0A0A0A] to-transparent md:w-32" />

        <div className="bp-marquee flex w-max gap-5 py-4">
          {repeatedTestimonials.map((item, idx) => (
            <div
              key={`${item.quoteId}-${idx}`}
              className="group relative flex w-[350px] sm:w-[380px] md:w-[420px] shrink-0 flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.12] bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-6 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_14px_36px_-8px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/[0.28] hover:bg-white/[0.09] hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.35),0_20px_50px_-10px_rgba(0,0,0,0.7)]"
            >
              {/* Top Gloss Highlight (iOS Glass Specular) */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent transition-opacity duration-300 group-hover:via-white/60" />

              {/* Quote Text */}
              <p className="text-[14px] sm:text-[14.5px] leading-[1.65] text-[#D1D5DB] transition-colors group-hover:text-white">
                &ldquo;{quotes[item.quoteId]}&rdquo;
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
        </div>
      </div>
    </section>
  );
}
