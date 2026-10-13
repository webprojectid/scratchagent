"use client";

import Link from "next/link";
import { landingSessions } from "@/lib/landing-demo";

export function TestimonialsSection({ lang = "en" }: { lang?: "id" | "en" }) {
  const en = lang === "en";
  const excerpts = landingSessions(lang);

  return (
    <section className="relative mx-auto w-full max-w-[1360px] overflow-hidden px-5 py-20 md:px-10 md:py-28" aria-label={en ? "Sample plan excerpts" : "Cuplikan contoh plan"}>
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-[620px]">
          <h2 className="text-balance text-[clamp(1.85rem,3.4vw,2.9rem)] font-semibold leading-[1.1] tracking-[-.045em] text-[#F0F3F5]">
            {en ? "Inside the FutsalGo plan." : "Isi plan FutsalGo."}
          </h2>
        </div>
        <div className="max-w-[340px] text-left md:text-right">
          <p className="text-[14px] leading-relaxed text-[#A5AFA8]">
            {en ? "Requirements from the sample project. Open the plan to inspect the PRDs and tasks." : "Kebutuhan dari project contoh. Buka plan untuk melihat PRD dan task."}
          </p>
          <Link href="/project/demo" className="mt-2 inline-flex min-h-11 items-center text-sm text-[#74FA6A] underline underline-offset-4">
            {en ? "Open sample plan" : "Buka contoh plan"}
          </Link>
        </div>
      </div>
      <div className="testimonials-track relative mt-12 w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-[#0A0A0A] to-transparent md:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-[#0A0A0A] to-transparent md:w-16" />
        <div className="bp-marquee flex w-max gap-5 py-4">
          {[0, 1, 2].map(copy => <div key={copy} className="flex gap-5" aria-hidden={copy > 0 ? true : undefined}>
            {excerpts.map((item, index) => (
              <article key={item.title} className="flex w-[350px] shrink-0 flex-col justify-between rounded-[24px] border border-white/[0.12] bg-[#151A17] p-6 sm:w-[380px] md:w-[420px]">
                <div>
                  <p className="mb-4 text-[12px] text-[#A5AFA8]">FutsalGo / {en ? "Sample PRD" : "Contoh PRD"}</p>
                  <h3 className="text-[18px] font-medium leading-snug text-[#E8F0E8]">{item.title}</h3>
                  <p className="mt-4 text-[14px] leading-[1.65] text-[#C5CEC6]">{item.description}</p>
                </div>
                <div className="mt-6 border-t border-white/[0.08] pt-4">
                  <p className="mb-2 font-mono text-[11px] text-[#A5C89A]">F{String(index + 1).padStart(2, "0")} / {en ? "Acceptance criterion" : "Kriteria selesai"}</p>
                  <p className="text-[13px] leading-relaxed text-[#C5CEC6]">{item.selesaiBila[0]}</p>
                </div>
              </article>
            ))}
          </div>)}
        </div>
      </div>
    </section>
  );
}
