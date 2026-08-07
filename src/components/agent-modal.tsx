"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, X, FileText, Package, Terminal } from "lucide-react";

export function AgentPromptModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "CLI" }) })
      .then((r) => r.json())
      .then((d) => { if (d.token) setToken(d.token); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const prompt = token
    ? `Kamu akan mengerjakan task dari Scratch Agent lewat CLI npx Scratch Agent.
Prasyarat: Node.js. CLI otomatis ter-download via npx, tanpa install manual.

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

LANGKAH 4 — Setelah done=true:
 Jalankan aplikasi sekali lagi, verifikasi semua alur utama melawan "selesai bila"
 tiap fitur. Lampirkan checklist di laporan akhir. Jika ada rusak, lapor jujur.`
    : "";

  const downloadMd = () => { window.open(`/api/plans/${planId}/export?format=md`, "_blank"); };
  const downloadZip = () => { window.open(`/api/plans/${planId}/export?format=zip`, "_blank"); };

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
          initial={{ scale: 0.96, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 16 }}
          className="w-[340px] rounded-xl border border-white/[.06] bg-[#171d29] p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium tracking-tight text-white/80">Mulai Implementasi</h3>
            <button onClick={onClose} className="grid size-7 place-items-center rounded text-white/30 transition hover:text-[#74FA6A]" aria-label="Tutup"><X size={13} /></button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            <button
              onClick={downloadMd}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[.02] px-2 py-2 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              <FileText size={12} /> PRD
            </button>
            <button
              onClick={downloadZip}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[.02] px-2 py-2 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              <Package size={12} /> ZIP
            </button>
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${showPrompt ? "border border-[#74FA6A]/40 bg-[#74FA6A]/10 text-[#74FA6A]" : "border border-[#74FA6A] bg-[#74FA6A] text-black hover:bg-[#67E85E]"}`}
            >
              <Terminal size={12} /> Agent
            </button>
          </div>

          <AnimatePresence>
            {showPrompt && token && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                <div className="relative">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/[.06] bg-[#0e1218] p-2.5 font-mono text-[9px] leading-relaxed text-slate-400">
                    {prompt}
                    <span className="inline-block w-1.5 animate-pulse bg-[#74FA6A]/60">|</span>
                  </pre>
                  <button
                    className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded border border-white/10 bg-[#171d29] px-1.5 py-0.5 text-[9px] text-slate-400 transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A]"
                    onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  >
                    <Copy size={11} /> {copied ? "Tersalin" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-center text-[9px] text-slate-500">token pribadi — paste hanya ke agent yang dipercaya</p>
              </motion.div>
            )}
          </AnimatePresence>

          {showPrompt && !token && !loading && (
            <p className="mt-3 text-center text-[10px] text-red-400/80">Token tidak tersedia</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

