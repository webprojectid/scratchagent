"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Shell } from "@/components/brand";
import { SplineSceneBasic } from "@/components/ui/demo";
import Link from "next/link";
import { User } from "lucide-react";

export default function NewPlan() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [quota, setQuota] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("scratch_user");
    if (!user) { router.push("/login"); return; }
    setAuthed(true);
  }, [router]);

  const sectionRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const xPct = useTransform(mx, (v) => `${v * 100}%`);
  const yPct = useTransform(my, (v) => `${v * 100}%`);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("scratch_user") || '{}');
    fetch(`/api/generate?userId=${encodeURIComponent(user.email || "shared")}`).then((r) => r.json()).then((d) => setQuota(d.remaining ?? null)).catch(() => {});
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, [mx, my]);

  return (
    <Shell back="/">
      {!authed ? null : (
      <section ref={sectionRef} className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center justify-center mx-auto max-w-[1480px] px-5 py-10 md:px-10 md:py-12 lg:py-16">
        <div className="relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#101417] p-8 shadow-[0_28px_90px_#000A,inset_0_1px_0_#FFFFFF12] md:p-12">
          <div className="absolute right-4 top-4 z-20">
            <Link href="/profile" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A]">
              <User size={11} /> Profile
            </Link>
          </div>

          <motion.div className="pointer-events-none absolute z-[0] size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30" style={{ left: xPct, top: yPct, background: "radial-gradient(circle at center, rgba(255,255,255,.2) 0%, transparent 60%)" }} />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-10">
            <div>
              <p className="eyebrow">Misi baru {quota !== null && `· ${quota} generate tersisa`}</p>
              <h1 className="mt-5 max-w-[10ch] text-[clamp(2.8rem,5.2vw,5rem)] font-semibold leading-[.92] tracking-[-.065em] text-white">Apa yang harus dibangun?</h1>
              <p className="mt-4 max-w-[42ch] text-[14px] leading-6 text-[#9AA5B3]">Tulis ide mentah. Scratch Agent menyusun asumsi, fitur, dan task graph.</p>
              <form
                className="mt-7"
                onSubmit={(e) => {
                  e.preventDefault();
                  sessionStorage.setItem("rv_brief", brief);
                  router.push("/new/prefs");
                }}
              >
                <textarea
                  required
                  autoFocus
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="field min-h-[168px] resize-none rounded-[14px] border border-white/12 bg-[#0D1011]/86 text-[16px] leading-6 shadow-[0_0_0_1px_#74FA6A14,0_8px_30px_#0008] backdrop-blur-[2px] focus:border-[#74FA6A]"
                  placeholder="Contoh: Buat aplikasi booking studio musik..."
                />
                <div className="mt-4 flex justify-end">
                  <button className="btn px-7">Lanjut →</button>
                </div>
              </form>
            </div>

            <div className="relative flex h-[420px] w-full items-end justify-end overflow-visible md:h-[560px] lg:h-[620px]">
              <div className="absolute inset-x-0 bottom-0 flex justify-end overflow-visible">
                <div className="origin-bottom-right translate-x-[8%] translate-y-[9%] scale-[0.98] md:translate-x-[10%] md:translate-y-[11%] md:scale-[1.02] lg:translate-x-[12%] lg:translate-y-[12%] lg:scale-[1.06]">
                  {mounted && <SplineSceneBasic />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}
    </Shell>
  );
}
