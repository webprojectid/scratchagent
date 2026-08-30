"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Shell } from "@/components/brand";
import {
  Cpu,
  Terminal,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  Code2,
  PlugZap,
  Layers,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";

interface TokenInfo {
  hash: string;
  label: string;
  revoked: boolean;
  createdAt: string;
}

interface QuotaInfo {
  remaining: number;
  limit: number;
  resetAt: number;
  tier?: string;
  unlimited?: boolean;
}

interface LlmCfgInfo {
  baseUrl: string;
  model: string;
  apiKeySet: boolean;
  apiKeyMasked: string;
  source: string;
  providers: { baseUrl: string; models: string[]; apiKeySet: boolean; apiKeyMasked: string }[];
}

/** Satu provider di form Settings: baseUrl + key (baru) + daftar model. */
interface ProviderForm {
  baseUrl: string;
  apiKey: string;
  models: string;
  apiKeySet: boolean;
  apiKeyMasked: string;
}

interface TestResult {
  state: "running" | "ok" | "fail";
  text: string;
}

function GlassCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const enter = reduce ? {} : { opacity: 0, y: 10 };
  const visible = reduce ? {} : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={enter}
      animate={visible}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : delay }}
      className={`rounded-[18px] border border-white/[.08] bg-[#0E1210]/85 p-5 md:p-6 backdrop-blur-2xl shadow-[0_8px_32px_#000A,inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-white/[.14] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  icon,
  tag,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-[#74FA6A]/10 text-[#74FA6A]">
          {icon}
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#74FA6A]/80">{tag}</p>
      </div>
      <div className="mt-1 font-bold text-white leading-snug" style={{ fontSize: "15px" }}>
        {title}
      </div>
      {subtitle && <p className="mt-0.5 text-[12px] text-white/45">{subtitle}</p>}
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [authed, setAuthed] = useState(false);
  const [llmCfg, setLlmCfg] = useState<LlmCfgInfo | null>(null);
  const [providers, setProviders] = useState<ProviderForm[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<number, boolean>>({});
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [llmSaving, setLlmSaving] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.push("/login");
        return;
      }
      setAuthed(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  function load() {
    getCurrentUser().then((u) => {
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      fetch(`/api/tokens${qs}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setTokens(d);
        })
        .catch(() => {});

      fetch(`/api/generate${qs}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.remaining !== undefined) setQuota(d);
        })
        .catch(() => {});

      fetch(`/api/llm-config${qs}`)
        .then((r) => {
          if (!r.ok) {
            setLlmCfg(null);
            return;
          }
          return r.json();
        })
        .then((d: LlmCfgInfo | undefined) => {
          if (!d) {
            setLlmCfg(null);
            return;
          }
          setLlmCfg(d);
          const fromApi = (d.providers ?? []).map((p) => ({
            baseUrl: p.baseUrl,
            apiKey: "",
            models: p.models.join(", "),
            apiKeySet: p.apiKeySet,
            apiKeyMasked: p.apiKeyMasked,
          }));
          // Config lama (sebelum multi-provider): tampil sebagai satu provider.
          setProviders(fromApi.length > 0 ? fromApi : [{ baseUrl: d.baseUrl ?? "", apiKey: "", models: d.model ?? "", apiKeySet: d.apiKeySet, apiKeyMasked: d.apiKeyMasked }]);
          setTestResults({});
        })
        .catch(() => setLlmCfg(null));
    });
  }

  useEffect(() => {
    load();
  }, []);

  function updateProvider(index: number, patch: Partial<ProviderForm>) {
    setProviders((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addProvider() {
    setProviders((list) => [...list, { baseUrl: "", apiKey: "", models: "", apiKeySet: false, apiKeyMasked: "" }]);
  }

  function removeProvider(index: number) {
    setProviders((list) => list.filter((_, i) => i !== index));
    setTestResults((r) => {
      const next: Record<number, TestResult> = {};
      for (const [k, v] of Object.entries(r)) {
        const ki = Number(k);
        next[ki < index ? ki : ki - 1] = v;
      }
      return next;
    });
  }

  function moveProvider(index: number, direction: -1 | 1) {
    setProviders((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function testProvider(index: number) {
    const p = providers[index];
    const firstModel = p.models.split(/[\n,;]+/).map((m) => m.trim()).filter(Boolean)[0];
    if (!p.baseUrl || !firstModel) {
      setTestResults((r) => ({ ...r, [index]: { state: "fail", text: "Isi Base URL dan minimal 1 model dulu." } }));
      return;
    }
    setTestResults((r) => ({ ...r, [index]: { state: "running", text: "Menguji..." } }));
    try {
      const u = await getCurrentUser();
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      const res = await fetch(`/api/llm-config/test${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: p.baseUrl, apiKey: p.apiKey, model: firstModel }),
      });
      const d = await res.json();
      if (d?.ok) {
        setTestResults((r) => ({ ...r, [index]: { state: "ok", text: `Tersambung dalam ${d.latencyMs} ms via ${d.model}` } }));
      } else {
        setTestResults((r) => ({ ...r, [index]: { state: "fail", text: d?.error ?? "Gagal terhubung." } }));
      }
    } catch {
      setTestResults((r) => ({ ...r, [index]: { state: "fail", text: "Gagal terhubung (jaringan)." } }));
    }
  }

  function saveLlm() {
    setLlmSaving(true);
    getCurrentUser().then((u) => {
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      fetch(`/api/llm-config${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: providers.map((p) => ({ baseUrl: p.baseUrl, apiKey: p.apiKey, models: p.models })),
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          setLlmSaving(false);
          if (d?.ok) {
            setToast({ text: `${d.providers} provider LLM tersimpan, failover berurutan aktif`, ok: true });
            setTimeout(() => setToast(null), 3000);
            load();
          } else {
            setToast({ text: "Gagal menyimpan: " + (d?.error ?? "unknown"), ok: false });
            setTimeout(() => setToast(null), 3500);
          }
        })
        .catch(() => {
          setLlmSaving(false);
          setToast({ text: "Terjadi kesalahan jaringan saat menyimpan.", ok: false });
          setTimeout(() => setToast(null), 3000);
        });
    });
  }

  function createToken() {
    setCreatingToken(true);
    getCurrentUser().then((u) => {
      fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `CLI-${new Date().toLocaleDateString("id-ID")}`, userId: u?.email }),
      })
        .then((r) => r.json())
        .then((d) => {
          setCreatingToken(false);
          if (d?.token) {
            setNewToken(d.token);
            load();
          }
        })
        .catch(() => setCreatingToken(false));
    });
  }

  function revoke(hash: string) {
    getCurrentUser().then((u) => {
      fetch("/api/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, userId: u?.email }),
      })
        .then((r) => r.json())
        .then(() => {
          setToast({ text: "Token berhasil dicabut", ok: true });
          setTimeout(() => setToast(null), 2500);
          load();
        })
        .catch(() => {
          setToast({ text: "Gagal mencabut token", ok: false });
          setTimeout(() => setToast(null), 2500);
        });
    });
  }

  const handleCopy = (text: string, isNewToken = false) => {
    navigator.clipboard.writeText(text);
    if (isNewToken) {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } else {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  // Urutkan token: yang aktif (revoked === false) selalu tampil di atas, lalu urut waktu
  const sortedTokens = [...tokens].sort((a, b) => {
    if (a.revoked !== b.revoked) {
      return a.revoked ? 1 : -1;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  if (!authed) return null;

  const ease = [0.16, 1, 0.3, 1] as const;
  const enter = reduce ? {} : { opacity: 0, y: 8 };
  const visible = reduce ? {} : { opacity: 1, y: 0 };

  return (
    <Shell back="/admin/users" sidebar={false}>
      <div className="mx-auto w-full max-w-[1140px] px-5 pb-16 pt-12 md:pt-16">
        {/* Top Header */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.3, ease }}
          className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] border border-white/[.08] bg-[#0E1210]/90 p-5 md:p-7 backdrop-blur-2xl"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[.18em] text-[#74FA6A]">
                developer hub
              </span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[10.5px] font-medium text-white/40">system configuration</span>
            </div>
            <div
              className="mt-1 font-bold tracking-tight text-white"
              style={{ fontSize: "18px", lineHeight: "1.3" }}
            >
              Konfigurasi &amp; LLM Settings
            </div>
            <p className="mt-1 text-[12.5px] text-white/50">
              Kelola engine LLM, multi-model failover, API key, token agent CLI, dan kapasitas kuota generate.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:border-[#74FA6A]/50 hover:text-[#74FA6A]"
            >
              <ArrowLeft size={13} /> Kelola Akun
            </Link>
            <Link
              href="/admin/security"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:border-[#74FA6A]/50 hover:text-[#74FA6A]"
            >
              <ShieldCheck size={13} /> Pusat Keamanan
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-3.5 py-1.5 text-[12px] font-semibold text-black transition hover:bg-[#A8FF9B]"
            >
              Profile
            </Link>
          </div>
        </motion.section>

        {/* 2-Column Balanced Equal Grid Layout (50% - 50%) */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2 items-stretch">
          {/* LEFT COLUMN: Engine AI & LLM Provider */}
          <div className="flex flex-col h-full">
            {llmCfg ? (
              <GlassCard delay={0.05} className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionHeader
                      icon={<Cpu size={14} />}
                      tag="engine ai &amp; provider"
                      title="Konfigurasi LLM Multi-Provider"
                      subtitle="Provider dicoba berurutan dari atas; di dalamnya failover antar model."
                    />
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-0.5 font-mono text-[10.5px] text-white/60">
                      <Database size={11} className="text-[#74FA6A]" />
                      <span>
                        Sumber: <strong className="text-[#74FA6A]">{llmCfg.source === "database" ? "Database" : "ENV"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Daftar provider failover: kartu per prioritas */}
                  <div className="mt-4 space-y-3">
                    {providers.map((p, i) => {
                      const test = testResults[i];
                      return (
                        <div key={i} className="rounded-[14px] border border-white/[.08] bg-white/[.02] p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`grid size-5 shrink-0 place-items-center rounded-md font-mono text-[10.5px] font-bold ${i === 0 ? "bg-[#74FA6A] text-black" : "bg-white/10 text-white/60"}`}>
                                {i + 1}
                              </span>
                              <span className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[.12em] text-white/50">
                                {i === 0 ? "Provider Utama" : `Backup ${i}`}
                                {p.apiKeySet && <span className="ml-1.5 normal-case tracking-normal text-white/30">{p.apiKeyMasked}</span>}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveProvider(i, -1)}
                                disabled={i === 0}
                                className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                                aria-label="Naikkan prioritas provider"
                              ><ArrowUp size={12} /></button>
                              <button
                                type="button"
                                onClick={() => moveProvider(i, 1)}
                                disabled={i === providers.length - 1}
                                className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                                aria-label="Turunkan prioritas provider"
                              ><ArrowDown size={12} /></button>
                              <button
                                type="button"
                                onClick={() => removeProvider(i)}
                                disabled={providers.length === 1}
                                className="rounded p-1 text-white/40 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-white/40"
                                aria-label="Hapus provider"
                              ><Trash2 size={12} /></button>
                            </div>
                          </div>

                          <label className="mt-3 block font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-white/40">
                            Base URL
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-[10px] border border-white/[.08] bg-white/[.04] px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/20 focus:border-[#74FA6A]/50 focus:outline-none"
                            value={p.baseUrl}
                            onChange={(e) => updateProvider(i, { baseUrl: e.target.value })}
                            placeholder="https://tunnel.example.com/v1"
                          />

                          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-white/40">
                                API Key
                              </label>
                              <div className="relative mt-1">
                                <input
                                  type={showApiKeys[i] ? "text" : "password"}
                                  className="w-full rounded-[10px] border border-white/[.08] bg-white/[.04] py-2 pl-3 pr-8 font-mono text-[12px] text-white placeholder:text-white/20 focus:border-[#74FA6A]/50 focus:outline-none"
                                  value={p.apiKey}
                                  onChange={(e) => updateProvider(i, { apiKey: e.target.value })}
                                  placeholder={p.apiKeySet ? `Tersimpan ${p.apiKeyMasked}` : "sk-..."}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowApiKeys((s) => ({ ...s, [i]: !s[i] }))}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white"
                                  aria-label={showApiKeys[i] ? "Sembunyikan API key" : "Tampilkan API key"}
                                >
                                  {showApiKeys[i] ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-white/40">
                                Model (failover)
                              </label>
                              <input
                                type="text"
                                className="mt-1 w-full rounded-[10px] border border-white/[.08] bg-white/[.04] px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/20 focus:border-[#74FA6A]/50 focus:outline-none"
                                value={p.models}
                                onChange={(e) => updateProvider(i, { models: e.target.value })}
                                placeholder="model-utama, model-backup"
                              />
                            </div>
                          </div>

                          <div className="mt-2.5 flex min-h-[24px] flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => testProvider(i)}
                              disabled={test?.state === "running"}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10.5px] font-semibold text-white/70 transition hover:border-[#74FA6A]/50 hover:text-[#74FA6A] disabled:opacity-50"
                            >
                              {test?.state === "running" ? <RefreshCw size={11} className="animate-spin" /> : <PlugZap size={11} />}
                              Tes Koneksi
                            </button>
                            {test && (
                              <span className={`min-w-0 flex-1 truncate text-right font-mono text-[10.5px] ${test.state === "ok" ? "text-[#74FA6A]" : test.state === "fail" ? "text-red-400" : "text-white/40"}`}>
                                {test.state === "ok" && "✓ "}{test.text}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={addProvider}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-white/[.14] py-2 text-[12px] font-medium text-white/50 transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A]"
                  >
                    <Plus size={13} /> Tambah Provider Backup
                  </button>
                  <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-4 text-white/35">
                    <Layers size={12} className="mt-0.5 shrink-0 text-white/30" />
                    Saat provider utama habis kuota, timeout, atau down, generate otomatis lanjut ke backup di bawahnya, lalu ke model berikutnya di dalam provider yang sama.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[.06]">
                  <button
                    onClick={saveLlm}
                    disabled={llmSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#74FA6A] py-2 text-[12.5px] font-semibold text-black transition hover:bg-[#A8FF9B] disabled:opacity-50"
                  >
                    {llmSaving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    {llmSaving ? "Menyimpan…" : "Simpan Konfigurasi LLM"}
                  </button>
                </div>
              </GlassCard>
            ) : (
              <GlassCard delay={0.05} className="flex-1 flex items-center">
                <div className="flex items-center gap-3">
                  <Cpu size={18} className="text-[#74FA6A]" />
                  <div>
                    <p className="font-semibold text-white text-[14px]">LLM Configuration (Admin Only)</p>
                    <p className="text-[12px] text-white/40">
                      Konfigurasi runtime LLM hanya dapat diakses oleh akun admin terdaftar.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* RIGHT COLUMN: Integrasi CLI & Token Hub (Same Height) */}
          <div className="flex flex-col h-full">
            <GlassCard delay={0.1} className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <SectionHeader
                    icon={<Terminal size={14} />}
                    tag="integrasi cli"
                    title="Token &amp; Agent CLI"
                    subtitle="Koneksi token untuk coding agent di terminal."
                  />
                  <button
                    onClick={createToken}
                    disabled={creatingToken}
                    className="inline-flex items-center gap-1 rounded-full bg-[#74FA6A] px-3 py-1 text-[11.5px] font-semibold text-black transition hover:bg-[#A8FF9B] disabled:opacity-50"
                  >
                    {creatingToken ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={12} />}
                    Buat Token
                  </button>
                </div>

                {/* Newly Generated Token Alert */}
                {newToken && (
                  <div className="mt-4 rounded-[12px] border border-[#74FA6A]/35 bg-[#74FA6A]/[.06] p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[.1em] text-[#74FA6A]">
                        Token Baru (Simpan Sekarang):
                      </p>
                      <button
                        onClick={() => handleCopy(newToken, true)}
                        className="inline-flex items-center gap-1 rounded bg-[#74FA6A] px-2 py-0.5 font-mono text-[10px] font-bold text-black hover:bg-[#A8FF9B]"
                      >
                        {tokenCopied ? <Check size={10} /> : <Copy size={10} />}
                        {tokenCopied ? "Tersalin!" : "Salin"}
                      </button>
                    </div>
                    <code className="mt-1.5 block break-all rounded-md bg-black/50 p-2 font-mono text-[10.5px] text-white/90">
                      {newToken}
                    </code>
                  </div>
                )}

                {/* Token List (Sorted: Active first) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/35 pb-1 border-b border-white/[.06]">
                    <span>Daftar Token ({sortedTokens.length})</span>
                    <span>Aksi</span>
                  </div>

                  <div className="mt-2 max-h-[175px] overflow-y-auto pr-1 space-y-1.5">
                    {sortedTokens.length === 0 ? (
                      <div className="py-6 text-center text-[12px] text-white/30">
                        Belum ada CLI token. Klik &quot;Buat Token&quot; di atas.
                      </div>
                    ) : (
                      sortedTokens.map((t) => (
                        <div
                          key={t.hash}
                          className="flex items-center justify-between gap-2 rounded-[10px] border border-white/[.06] bg-white/[.02] px-3 py-2 text-[12px] transition hover:bg-white/[.04]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white/85 truncate">{t.label}</span>
                              <span
                                className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${
                                  t.revoked ? "bg-red-500/15 text-red-400" : "bg-[#74FA6A]/15 text-[#74FA6A]"
                                }`}
                              >
                                {t.revoked ? "Dicabut" : "Aktif"}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-white/30 block truncate">
                              {t.hash.slice(0, 14)}…
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {!t.revoked && (
                              <>
                                <button
                                  onClick={() => handleCopy(`scratch-agent login --token ${t.hash}`)}
                                  className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                                  title="Salin scratch-agent login"
                                >
                                  {copiedHash === `scratch-agent login --token ${t.hash}` ? (
                                    <Check size={13} className="text-[#74FA6A]" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                                <button
                                  onClick={() => revoke(t.hash)}
                                  className="rounded p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                                  title="Cabut Token"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Integrated CLI Quick Commands */}
              <div className="mt-5 border-t border-white/[.06] pt-3">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-white/40">
                  <Code2 size={12} className="text-[#74FA6A]" />
                  <span>Perintah Eksekusi CLI:</span>
                </div>
                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between rounded-[8px] bg-black/40 px-2.5 py-1.5 text-white/70">
                    <span>1. Login: <code className="text-[#74FA6A]">scratch-agent login --token &lt;token&gt;</code></span>
                  </div>
                  <div className="flex items-center justify-between rounded-[8px] bg-black/40 px-2.5 py-1.5 text-white/70">
                    <span>2. Run: <code className="text-[#74FA6A]">scratch-agent run --plan &lt;planId&gt;</code></span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* BOTTOM SECTION: Status Kuota Generate (Balanced full width) */}
        <div className="mt-5">
          <GlassCard delay={0.15}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SectionHeader
                icon={<Activity size={14} />}
                tag="kapasitas sistem"
                title="Status Kuota Generate"
                subtitle="Pemantauan rolling reset 24 jam untuk user."
              />

              {quota ? (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-[12px] border border-white/[.06] bg-white/[.02] px-4 py-2.5 min-w-[160px]">
                    <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">
                      {quota.tier === "pro" ? "Status Quota Pro" : quota.unlimited ? "Kuota Admin" : "Sisa Free Quota"}
                    </p>
                    <p
                      className="mt-1 font-bold text-[#74FA6A]"
                      style={{ fontSize: "17px" }}
                    >
                      {quota.tier === "pro" || quota.unlimited || quota.remaining === Infinity ? (
                        "Unlimited"
                      ) : (
                        <>
                          {quota.remaining} <span className="text-[13px] font-normal text-white/40">/ {quota.limit}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="rounded-[12px] border border-white/[.06] bg-white/[.02] px-4 py-2.5 min-w-[180px]">
                    <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">
                      {quota.tier === "pro" || quota.unlimited ? "Akses Kuota" : "Jadwal Reset"}
                    </p>
                    <p className="mt-1 font-mono text-[12px] font-semibold text-white">
                      {quota.tier === "pro" || quota.unlimited ? (
                        <span className="text-[#74FA6A]">Tanpa batas generate</span>
                      ) : (
                        <>
                          {new Date(quota.resetAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{" "}
                          <span className="text-[10.5px] font-normal text-white/40">
                            ({new Date(quota.resetAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })})
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11.5px] text-white/40">
                  <RefreshCw size={12} className="animate-spin" /> Memuat data kuota…
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Toast Notification */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full border px-4 py-2.5 shadow-2xl backdrop-blur-xl ${
              toast.ok
                ? "border-[#74FA6A]/40 bg-[#0E1210]/95 text-[#74FA6A] shadow-[0_0_25px_rgba(116,250,106,0.2)]"
                : "border-red-500/40 bg-[#0E1210]/95 text-red-400"
            }`}
          >
            {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span className="text-[12.5px] font-medium text-white">{toast.text}</span>
          </motion.div>
        )}
      </div>
    </Shell>
  );
}
