"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import { buildAgentPrompt } from "@/lib/agent-prompt";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Copy, FileText, Package, Sparkles, X } from "lucide-react";
import { legacyHandoff, type HandoffSettings } from "@/lib/account-preferences";
import { getCurrentUser } from "@/lib/current-user";

const steps = [
  { title: "Copy prompt", desc: "Sudah berisi token akses dan ID plan, siap pakai." },
  { title: "Buka coding agent", desc: "Claude Code, OpenCode, atau Cursor di folder project target." },
  { title: "Paste dan jalankan", desc: "Agent mengeksekusi task satu per satu mengikuti urutan server." },
];

export function AgentPromptModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  useUiLanguage();
  const [handoff, setHandoff] = useState<HandoffSettings>(legacyHandoff);
  const [tokenError, setTokenError] = useState("");
  useEffect(() => { fetch(`/api/plans/${planId}/export`).then(response => response.ok ? response.json() : null).then(plan => { if (plan?.generationSettings) setHandoff(plan.generationSettings); }).catch(() => {}); }, [planId]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tier, setTier] = useState<"free" | "pro">("free");

  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.tier === "pro") setTier("pro");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "Agent project", days: 30, access: "write", projectIds: /^[0-9a-f-]{36}$/i.test(planId) ? [planId] : [], userId: u?.email }) })
        .then((r) => r.json())
        .then((d) => {
          if (active && d.token) setToken(d.token);
          else if (active) setTokenError(d.error || ui("Token belum bisa dibuat. Coba kembali."));
        })
        .catch(() => { if (active) setTokenError(ui("Server token belum bisa dihubungi.")); })
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

  const serverUrl = typeof window !== "undefined" ? window.location.origin : "";

  const prompt = token ? buildAgentPrompt(planId, token, serverUrl, handoff) : "";

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
          className="w-[460px] max-w-full rounded-2xl border border-border bg-background shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/[.08]">
                <Sparkles size={15} className="text-primary" />
              </span>
              <div>
                <h3 className="!text-[15px] !font-semibold !leading-tight !tracking-tight text-foreground">{ui("Implementasi dengan AI agent")}</h3>
                <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{ui("Serahkan plan ini ke coding agent. Tiga langkah, tanpa setup manual.")}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
              aria-label={ui("Tutup")}
            >
              <X size={14} />
            </button>
          </div>

          {/* Steps */}
          <div className="px-5">
            <ol className="relative space-y-3.5">
              <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-foreground/15 via-foreground/8 to-transparent" />
              {steps.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, duration: 0.25 }}
                  className="relative flex items-start gap-3"
                >
                  <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full border border-primary/25 bg-background font-mono text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[13.5px] font-medium leading-tight text-foreground">{ui(s.title)}</span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">{ui(s.desc)}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Prompt block */}
          <div className="p-5 pt-4">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                  <span className="size-1 rounded-full bg-primary/70" /> agent-prompt
                </span>
                <button
                  onClick={copyPrompt}
                  disabled={!token}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-foreground/[.03] px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {loading ? ui("Menyiapkan...") : copied ? ui("Copied") : ui("Copy prompt")}
                </button>
              </div>
              {loading ? (
                <div className="space-y-1.5 p-3.5">
                  {[80, 62, 71, 45].map((w, i) => (
                    <div key={i} className="h-2 animate-pulse rounded bg-foreground/[.05]" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : token ? (
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-3.5 font-mono text-[11.5px] leading-[1.7] text-muted-foreground">
                  {tokenError ? tokenError : prompt}
                </pre>
              ) : (
                <p className="p-3.5 text-[12.5px] text-destructive">{ui("Token tidak tersedia. Coba lagi.")}</p>
              )}
            </div>

            {/* PRD & ZIP: fitur Pro sesuai tabel pricing; Free dikunci + diarahkan upgrade. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={tier === "pro" ? downloadMd : undefined}
                disabled={tier !== "pro"}
                title={tier !== "pro" ? ui("Export PRD hanya untuk paket Pro") : undefined}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-foreground/[.02] px-3 py-2 text-[12.5px] text-muted-foreground transition hover:border-border hover:text-foreground active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <FileText size={13} /> {tier === "pro" ? "File PRD" : "File PRD (Pro)"}
              </button>
              <button
                onClick={tier === "pro" ? downloadZip : undefined}
                disabled={tier !== "pro"}
                title={tier !== "pro" ? ui("Export ZIP hanya untuk paket Pro") : undefined}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-foreground/[.02] px-3 py-2 text-[12.5px] text-muted-foreground transition hover:border-border hover:text-foreground active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <Package size={13} /> {tier === "pro" ? "ZIP" : "ZIP (Pro)"}
              </button>
            </div>
            {tier !== "pro" && (
              <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">{ui("Export PRD terkunci untuk paket Free.")}<Link href="/pricing" className="text-primary/80 underline-offset-2 hover:underline">Upgrade ke Pro</Link>{ui("untuk membukanya.")}</p>
            )}

            <p className="mt-3 text-center text-[10.5px] leading-4 text-muted-foreground">{ui("Prompt mengandung token pribadi. Paste hanya ke agent yang kamu percaya.")}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
