"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Shell } from "@/components/brand";
import { SplineSceneBasic } from "@/components/ui/demo";
import Link from "next/link";
import { User, Loader2 } from "lucide-react";
import { getCurrentUser, supabaseConfigured } from "@/lib/current-user";

export default function NewPlan() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [quota, setQuota] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (supabaseConfigured()) {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }
      } else {
        const user = localStorage.getItem("scratch_user");
        if (!user) {
          router.push("/login");
          return;
        }
      }
      setAuthed(true);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  // FIXED: No scrolling allowed - full viewport fixed
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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
    <Shell back="/" sidebar={false}>
      {loading || !authed ? (
        // Loading state untuk mencegah blank/black screen
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#74FA6A]" />
          <p className="ml-3 text-slate-400 text-sm">Memuat…</p>
        </div>
      ) : (
      <section ref={sectionRef} className="relative isolate flex h-screen min-h-[100dvh] items-center justify-center bg-[#0F1113] overflow-hidden">
        <div className="relative w-full max-w-[1054px] aspect-[5/4] mx-auto px-4 pt-[13px] pb-[13px] md:px-6 md:pt-[18px] md:pb-[18px] lg:pt-[18px] lg:pb-[18px] overflow-hidden rounded-[24px] border border-white/10 bg-[#101417] shadow-[0_28px_90px_#000A,inset_0_1px_0_#FFFFFF12]">
          <div className="absolute right-4 top-4 z-20">
            <Link href="/profile" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A]">
              <User size={11} /> Profile
            </Link>
          </div>

          <motion.div className="pointer-events-none absolute z-[0] size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30" style={{ left: xPct, top: yPct, background: "radial-gradient(circle at center, rgba(255,255,255,.2) 0%, transparent 60%)" }} />

          <div className="relative z-10 grid h-full items-center gap-12 lg:grid-cols-[1fr_308px]">
            {/* Form Section - Better vertical spacing */}
            <div className="flex flex-col justify-start py-8 lg:py-0 overflow-hidden">
              <p className="eyebrow mb-6 text-xs font-medium tracking-wide uppercase text-slate-500">Misi baru {quota !== null && `· ${quota} generate tersisa`}</p>
              
              <h1 className="mb-6 max-w-[9ch] font-semibold leading-[1.1] tracking-tight text-white" style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>Apa yang harus dibangun?</h1>
              
              <p className="mb-8 max-w-[45ch] text-sm leading-relaxed text-slate-400">Tulis ide mentah. Scratch Agent menyusun asumsi, fitur, dan task graph secara otomatis.</p>
              
              <form
                className="mt-auto"
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
                  className="field mb-4 w-full max-w-[420px] min-h-[96px] resize-none rounded-xl border border-white/12 bg-[#0D1011]/86 p-4 text-base leading-relaxed shadow-lg backdrop-blur-md transition-all focus:border-emerald-400 focus:shadow-[0_0_0_2px_rgba(124,250,106,0.2)] placeholder:text-slate-600"
                  placeholder="Contoh: Buat aplikasi booking studio musik..."
                />
                <button className="btn group flex items-center gap-2 px-6 py-3 text-base font-medium">
                  Lanjut 
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </form>
            </div>

            {/* Robot 3D Spline - Full height centered */}
            <div className="relative flex items-center justify-center overflow-visible p-2">
              <SplineSceneBasic />
            </div>
          </div>
        </div>
      </section>
      )}
    </Shell>
  );
}
