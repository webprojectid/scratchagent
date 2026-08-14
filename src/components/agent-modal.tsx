"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Copy, FileText, Package, Sparkles, X } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";

const steps = [
  { title: "Salin prompt", desc: "Sudah berisi token akses dan ID plan — siap pakai." },
  { title: "Buka coding agent", desc: "Claude Code, OpenCode, atau Cursor di folder project target." },
  { title: "Tempel dan jalankan", desc: "Agent mengeksekusi task satu per satu mengikuti urutan server." },
];

export function AgentPromptModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "CLI", userId: u?.email }) })
        .then((r) => r.json())
        .then((d) => {
          if (active && d.token) setToken(d.token);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const prompt = token
    ? `Kamu akan mengerjakan task dari Scratch Agent lewat CLI npx Scratch Agent.
Prasyarat: Node.js + Python 3.x. CLI otomatis ter-download via npx, tanpa install manual.

LANGKAH 0 — Install Skill Scratch Agent v2.4 (sekali saja):
 Cek apakah sudah terpasang: uipro --version
 Jika SUDAH: lanjut.
 Jika BELUM: install sekali lalu lanjut (TIDAK perlu restart):
  npm install -g ui-ux-pro-max-cli
  uipro init --ai opencode --global

LANGKAH 1 — Login & init (sekali saja):
 npx Scratch Agent login --token ${token}
 npx Scratch Agent init --agent opencode

LANGKAH 2 — Baca PRD (sekali):
 npx Scratch Agent plan get ${planId}

LANGKAH 3 — LOOP kerjakan SATU task per siklus:
 npx Scratch Agent task next --plan ${planId} --json
 npx Scratch Agent task start <ref>
 # ...kerjakan task ini (eksplor kode dulu, ikuti pola project)...
 npx Scratch Agent task complete <ref>
 # Jika ke-block: npx Scratch Agent task fail <ref> "alasan singkat"
 # Ulangi sampai done=true

ATURAN:
- Jika task next menyertakan last_fail_reason: BACA dulu, ganti pendekatan.
- Jika respons blocked=true: berhenti, lapor daftar task gagal, tunggu perintah.
- Jika respons checkpoint=true: JANGAN mulai task. Berhenti, lapor, tunggu "lanjut".
- Jangan borong task; percayakan urutan ke server.
- Saat mengerjakan task frontend/UI: CEK apakah Skill Scratch Agent aktif
  otomatis. Jika AKTIF: terapkan rekomendasinya (warna, tipografi, layout,
  best practice) supaya hasil profesional. Jika TIDAK aktif: beri tau user
  "Skill Scratch Agent belum aktif (mungkin perlu sesi baru agar ter-load)",
  lalu tetap lanjutkan dengan best practice UI umum.

LANGKAH 4 — Setelah done=true:
 Jalankan aplikasi sekali lagi, verifikasi semua alur utama melawan "selesai bila"
 tiap fitur. Lampirkan checklist di laporan akhir. Jika ada rusak, lapor jujur.`
    : "";

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportQs = async () => {
    const u = await getCurrentUser();
    return u?.email ? `&userId=${encodeURIComponent(u.email)}` : "";
  };
  const downloadMd = () => {
    exportQs().then((qs) => window.open(`/api/plans/${planId}/export?format=md${qs}`, "_blank"));
  };
  const downloadZip = () => {
    exportQs().then((qs) => window.open(`/api/plans/${planId}/export?format=zip${qs}`, "_blank"));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.97, y: 14 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.97, y: 14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-[460px] max-w-full rounded-2xl border border-white/[.08] bg-[#12151A] shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#74FA6A]/20 bg-[#74FA6A]/[.08]">
                <Sparkles size={15} className="text-[#74FA6A]" />
              </span>
              <div>
                <h3 className="!text-[15px] !font-semibold !leading-tight !tracking-tight text-white">
                  Implementasi dengan AI agent
                </h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Serahkan plan ini ke coding agent. Tiga langkah, tanpa setup manual.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-white/30 transition hover:bg-white/5 hover:text-white"
              aria-label="Tutup"
            >
              <X size={14} />
            </button>
          </div>

          {/* Steps */}
          <div className="px-5">
            <ol className="relative space-y-3.5">
              <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-white/15 via-white/8 to-transparent" />
              {steps.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, duration: 0.25 }}
                  className="relative flex items-start gap-3"
                >
                  <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full border border-[#74FA6A]/25 bg-[#12151A] font-mono text-[9px] font-bold text-[#74FA6A]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[12px] font-medium leading-tight text-white/85">{s.title}</span>
                    <span className="mt-0.5 block text-[10.5px] leading-4 text-slate-500">{s.desc}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Prompt block */}
          <div className="p-5 pt-4">
            <div className="overflow-hidden rounded-xl border border-white/[.07] bg-[#0A0C0E]">
              <div className="flex items-center justify-between border-b border-white/[.06] px-3 py-2">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.14em] text-white/25">
                  <span className="size-1 rounded-full bg-[#74FA6A]/70" /> agent-prompt
                </span>
                <button
                  onClick={copyPrompt}
                  disabled={!token}
                  className="flex items-center gap-1.5 rounded-md border border-white/[.08] bg-white/[.03] px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {loading ? "Menyiapkan..." : copied ? "Tersalin" : "Salin prompt"}
                </button>
              </div>
              {loading ? (
                <div className="space-y-1.5 p-3.5">
                  {[80, 62, 71, 45].map((w, i) => (
                    <div key={i} className="h-2 animate-pulse rounded bg-white/[.05]" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : token ? (
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-3.5 font-mono text-[10px] leading-[1.7] text-slate-400">
                  {prompt}
                </pre>
              ) : (
                <p className="p-3.5 text-[11px] text-red-400/80">Token tidak tersedia. Coba lagi.</p>
              )}
            </div>

            {/* PRD & ZIP */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={downloadMd}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.02] px-3 py-2 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white active:scale-[.99]"
              >
                <FileText size={12} /> File PRD
              </button>
              <button
                onClick={downloadZip}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.02] px-3 py-2 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white active:scale-[.99]"
              >
                <Package size={12} /> ZIP
              </button>
            </div>

            <p className="mt-3 text-center text-[9px] leading-3 text-slate-600">
              Prompt mengandung token pribadi — tempel hanya ke agent yang kamu percaya.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
