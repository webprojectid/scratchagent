"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
import { SplineSceneBasic } from "@/components/ui/demo";
import { Loader2 } from "lucide-react";
import { getCurrentUser, supabaseConfigured } from "@/lib/current-user";

export default function NewPlan() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [quota, setQuota] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ left: '50%', top: '50%' });

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setAuthed(true);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener("input", handleInput);
    handleInput();

    return () => { textarea.removeEventListener("input", handleInput); };
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({
        left: `${xPercent}%`,
        top: `${yPercent}%`,
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); };
  }, [loading, authed]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("scratch_user") || '{}');
    fetch(`/api/generate?userId=${encodeURIComponent(user.email || "shared")}`)
      .then((r) => r.json())
      .then((d) => setQuota(d.remaining ?? null))
      .catch(() => {});
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <Shell back="/" sidebar={false}>
      {loading || !authed ? (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#74FA6A]" />
          <p className="ml-3 text-slate-400 text-sm">Memuat…</p>
        </div>
      ) : (
        <section
          ref={sectionRef}
          className="relative isolate flex h-screen min-h-[100dvh] max-lg:h-auto max-lg:min-h-[100dvh] items-center justify-center bg-[#0F1113] max-lg:overflow-y-auto overflow-hidden"
        >
          {/* Card */}
          <div className="relative w-full max-w-[1200px] h-[600px] max-lg:h-auto max-lg:min-h-[560px] mx-auto px-4 md:px-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_28px_90px_#000A,inset_0_1px_0_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(255,255,255,0.05)] ring-1 ring-white/[0.08]">
            
            {/* Cursor glow - radial gradient silver-white following mouse */}
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background: `radial-gradient(700px circle at ${mousePos.left} ${mousePos.top}, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)`,
              }}
            />

            {/* Grid */}
            <div className="relative z-10 grid h-full items-end gap-8 pt-4 lg:grid-cols-[1fr_560px]">
              {/* Form */}
              <div className="flex flex-col justify-start py-6 lg:py-0 overflow-hidden self-center">
                <h1
                  className="mb-3 max-w-[9ch] font-semibold leading-[1.15] tracking-tight text-white px-2"
                  style={{ fontSize: "clamp(2.25rem, 4vw, 3rem)" }}
                >
                  Apa yang harus dibangun?
                </h1>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (brief.length > 4000) { alert("Maksimal 4000 karakter"); return; }
                    sessionStorage.setItem("rv_brief", brief);
                    router.push("/new/prefs");
                  }}
                  className="px-2 pb-4 pt-4"
                >
                  <textarea
                    ref={textareaRef}
                    required
                    autoFocus
                    maxLength={4000}
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    onInput={() => textareaRef.current && (textareaRef.current.style.height = 'auto') || null}
                    className="field w-full max-w-[580px] resize-none rounded-xl border border-white/12 bg-[#0D1011]/86 p-5 text-lg leading-relaxed shadow-lg backdrop-blur-md transition-all focus:border-emerald-400 focus:shadow-[0_0_0_2px_rgba(124,250,106,0.2)] placeholder:text-slate-600"
                    placeholder="Contoh: Buat aplikasi booking studio musik..."
                    style={{ minHeight: "160px", maxHeight: "300px" }}
                  />
                  <div className="flex justify-end max-w-[580px]">
                    <button className="btn group flex items-center gap-2 px-6 py-3 text-lg font-medium">
                      Lanjut
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Robot — desktop original 580x540 scale 1.15; mobile/tablet
                  discale turun via .robot-scaler biar gak overflow layar kecil. */}
              <div className="relative flex h-full w-full items-end justify-center">
                <div className="robot-scaler">
                  <SplineSceneBasic />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </Shell>
  );
}
