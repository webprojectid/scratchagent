"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lightbulb, Lock, Send, X } from "lucide-react";
import type { PlanIdea } from "@/lib/types";

const IDEA_LIMIT = 2;

/**
 * Kolom chat "Ide Kamu" — fitur Pro.
 * - Tampil sebagai FLOATING CHAT BOX di bawah tengah layar, muncul pop-up
 *   ke atas seolah keluar dari taskbar desktop.
 * - User mengetik ide -> AI mengubahnya menjadi fase > sub-fitur > task baru.
 * - Maksimal 2 kali per project; sisanya tampil jelas.
 * - Free melihat kartu terkunci + ajakan upgrade.
 */
export function IdeaChatPanel({ planId, isPro, open, onClose }: { planId: string; isPro: boolean; open: boolean; onClose: () => void }) {
  useUiLanguage();
  const [ideas, setIdeas] = useState<PlanIdea[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const left = Math.max(0, IDEA_LIMIT - ideas.length);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch(`/api/plans/${planId}/ideas`)
      .then((r) => r.json())
      .then((d) => { if (active) { setIdeas(d.ideas ?? []); setLoaded(true); } })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [open, planId]);

  // Fokus langsung ke input + tutup dengan Escape, rasa chat box desktop.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 260);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/plans/${planId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? ui("Gagal mengirim ide."));
        setSending(false);
        return;
      }
      setText("");
      setIdeas(d.idea ? [...ideas, d.idea] : ideas);
      setSending(false);
      // Fase baru harus langsung terlihat di struktur. Reload ditunda sebentar
      // supaya user sempat lihat konfirmasi "fase baru dibuat".
      setSuccess(ui('Fase baru "{0}" sudah ditambahkan ke struktur.', d.idea?.featureTitle ?? ui("ide kamu")));
      setTimeout(() => window.location.reload(), 1400);
    } catch {
      setError(ui("Koneksi bermasalah, coba lagi."));
      setSending(false);
    }
  };

  if (!open) {
    // Tetap render (kosong) supaya AnimatePresence bisa mainin exit saat menutup.
    return null;
  }

  return (
    // Wrapper fixed full-width: motion y animasi box-nya tanpa nabrak transform tengah.
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 md:bottom-6" role="dialog" aria-label={ui("Kolom chat ide")}>
      <motion.div
        initial={{ y: "112%", scale: 0.88, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "112%", scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        style={{ transformOrigin: "bottom center" }}
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#282828] p-4 shadow-[0_24px_60px_rgba(0,0,0,.4)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-white/10">
              <Lightbulb size={13} className="text-slate-200" />
            </span>
            <h3 className="text-[13px] font-semibold text-white">{ui("Ide Kamu")}</h3>
            {isPro && loaded && (
              <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/50">
                {ui("Sisa {0}/{1}", left, IDEA_LIMIT)}
              </span>
            )}
          </div>
          <button onClick={onClose} className="grid size-7 place-items-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white" aria-label={ui("Tutup panel ide")}>
            <X size={14} />
          </button>
        </div>

        {!isPro ? (
          // Free: terkunci, diarahkan upgrade.
          <div className="mt-3 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <div className="flex items-start gap-3">
              <Lock size={16} className="mt-0.5 shrink-0 text-white/40" />
              <div>
                <p className="text-[13px] font-semibold text-white/85">{ui("Fitur khusus Pro")}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{ui("Ceritakan ide tambahanmu, dan AI mengubahnya menjadi fase baru lengkap dengan sub-fitur dan task. Hanya bisa dipakai 2 kali per project.")}</p>
                <a href="/pricing" className="landing-nav-button landing-nav-button-solid mt-4"><span>{ui("Upgrade ke Pro")}</span></a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Riwayat ide yang sudah dipakai */}
            {ideas.length > 0 && (
              <ul className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {ideas.map((idea, i) => (
                  <li key={i} className="rounded-lg border border-white/[.07] bg-white/[.02] px-3 py-2.5">
                    <p className="text-[12px] leading-relaxed text-slate-300">“{idea.text}”</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-200/70">{ui("→ jadi fase")}{" "}{idea.phase ?? "?"}: {idea.featureTitle ?? ui("diproses AI")}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* Form input ide */}
            {left > 0 ? (
              <div>
                <label htmlFor="idea-input" className="sr-only">{ui("Ide tambahan untuk project ini")}</label>
                <div className="flex items-end gap-2 rounded-xl border border-white/[.1] bg-[#070A08] p-2 focus-within:border-white/40">
                  <textarea
                    id="idea-input"
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    rows={2}
                    placeholder={ui("Tulis idemu di sini... AI akan mengubahnya jadi fase > sub-fitur > task. (Ctrl+Enter untuk kirim)")}
                    className="max-h-32 min-h-[52px] flex-1 resize-y bg-transparent px-2 py-1 text-[13px] text-white placeholder:text-white/25 focus:outline-none"
                    disabled={sending}
                    maxLength={2000}
                  />
                  <button
                    onClick={submit}
                    disabled={!text.trim() || sending}
                    className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e8f0e8] text-[#10200f] transition hover:brightness-110 disabled:opacity-35"
                    aria-label={ui("Kirim ide")}
                  >
                    <Send size={15} />
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-white/30">{ui("Ide langsung diolah AI menjadi fase baru di struktur.")}{" "}{text.length > 0 && `${text.length}/2000 · `}{ui("Sisa {0} kali kirim untuk project ini.", left)}</p>
              </div>
            ) : (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/[.05] px-3 py-2.5 text-[12px] text-amber-200/85">{ui("Kamu sudah memakai")}{" "}{IDEA_LIMIT}{" "}{ui("ide untuk project ini. Ide di atas tetap dibaca AI sebagai referensi di semua generasi berikutnya.")}</p>
            )}

            {success && <p className="text-[12px] text-slate-200">{success}{" "}{ui("Memuat ulang struktur…")}</p>}
            {error && <p className="text-[12px] text-rose-300">{error}</p>}
            {sending && <p className="animate-pulse text-[12px] text-slate-200/80">{ui("AI sedang mengubah idemu menjadi fase baru…")}</p>}
          </div>
        )}
      </motion.div>
    </div>
  );
}
