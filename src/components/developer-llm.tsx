"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Play } from "lucide-react";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
import accountStyles from "@/app/profile/account-ledger.module.css";
type ProviderForm = {
  baseUrl: string;
  apiKey: string;
  models: string;
  apiKeySet?: boolean;
  apiKeyMasked?: string;
  sourceIndex: number | null;
};

type TestResult = {
  ok: boolean;
  testing?: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
};

type LlmCfgInfo = {
  baseUrl?: string;
  model?: string;
  apiKeySet?: boolean;
  apiKeyMasked?: string;
  source?: string;
  providers?: {
    baseUrl: string;
    models: string[];
    apiKeySet: boolean;
    apiKeyMasked: string;
  }[];
};


export function DeveloperLlm({ email }: { email: string }) {
 useUiLanguage();
  // LLM state (Admin only)
  const [providers, setProviders] = useState<ProviderForm[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<number, boolean>>({});
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmError, setLlmError] = useState("");
  const [llmRevision, setLlmRevision] = useState(0);
  const loadedResources = useRef({ llm: false });
  const [toast, setToast] = useState<string | null>(null);


  useEffect(() => {
    if (loadedResources.current.llm) return;
    const controller = new AbortController();
    fetch(`/api/llm-config?userId=${encodeURIComponent(email)}`, { signal: controller.signal, cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(ui("LLM configuration could not be loaded.")); return r.json(); })
      .then((d: LlmCfgInfo) => {
        if (controller.signal.aborted) return;
        loadedResources.current.llm = true; setLlmLoading(false); setLlmError("");
        const fromApi = (d.providers ?? []).map((p, sourceIndex) => ({ sourceIndex, baseUrl: p.baseUrl, apiKey: "", models: p.models.join(", "), apiKeySet: p.apiKeySet, apiKeyMasked: p.apiKeyMasked }));
        setProviders(fromApi.length ? fromApi : [{ sourceIndex: 0, baseUrl: d.baseUrl ?? "", apiKey: "", models: d.model ?? "", apiKeySet: d.apiKeySet, apiKeyMasked: d.apiKeyMasked }]);
      })
      .catch(() => { if (!controller.signal.aborted) { setLlmLoading(false); setLlmError(ui("LLM configuration could not be loaded.")); } });
    return () => controller.abort();
  }, [email, llmRevision]);


  const updateProvider = (index: number, patch: Partial<ProviderForm>) => {
    setProviders((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addProvider = () => {
    if (providers.length >= 8) return;
    setProviders((list) => [...list, { sourceIndex: null, baseUrl: "", apiKey: "", models: "" }]);
  };

  const removeProvider = (index: number) => {
    setTestResults({}); setShowApiKeys({});
    if (providers.length <= 1) return;
    setProviders((list) => list.filter((_, i) => i !== index));
  };

  const moveProvider = (index: number, dir: -1 | 1) => {
    setTestResults({}); setShowApiKeys({});
    const target = index + dir;
    if (target < 0 || target >= providers.length) return;
    setProviders((list) => {
      const copy = [...list];
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      return copy;
    });
  };

  const testProvider = async (index: number) => {
    const p = providers[index];
    setTestResults((prev) => ({ ...prev, [index]: { ok: false, testing: true } }));
    try {
      const qs = "";
      const res = await fetch(`/api/llm-config/test${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: p.baseUrl, apiKey: p.apiKey, sourceIndex: p.sourceIndex, model: p.models.split(/[\n,;]+/).map(m => m.trim()).filter(Boolean)[0] ?? "" }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [index]: {
          testing: false,
          ok: res.ok && data.ok,
          model: data.model,
          latencyMs: data.latencyMs,
          error: data.error,
        },
      }));
    } catch (e: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [index]: { testing: false, ok: false, error: e instanceof Error ? e.message : ui("Koneksi gagal") },
      }));
    }
  };

  const saveLlm = async () => {
    setLlmSaving(true);
    try {
      const qs = "";
      const payload = {
        providers: providers.map((p) => ({
          sourceIndex: p.sourceIndex,
          baseUrl: p.baseUrl,
          apiKey: p.apiKey,
          models: p.models,
        })),
      };
      const res = await fetch(`/api/llm-config${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        loadedResources.current.llm = false; setLlmRevision(value => value + 1);
        setToast(ui("Konfigurasi LLM berhasil disimpan."));
        setTimeout(() => setToast(null), 3000);
      } else {
        const err = await res.json().catch(() => null);
        setToast(ui(err?.error || "Gagal menyimpan konfigurasi LLM"));
      }
    } catch { setToast(ui("Gagal menyimpan konfigurasi LLM")); } finally {
      setLlmSaving(false);
    }
  };


 return <>{toast && <p role="status">{toast}</p>}          <div className={accountStyles.accountSection}>
            {/* Header Seksi */}
            <div className="pb-6 border-b border-white/[.08] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">LLM Engine</h2>
                <p className="mt-1 text-xs text-white/50">{ui("Atur provider failover generator AI plan.")}</p>
              </div>
              <button
                disabled={providers.length >= 8 || llmSaving || llmLoading || !!llmError}
                onClick={addProvider}
                className="flex items-center gap-1 rounded border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white"
              >
                <Plus size={12} />{ui("Tambah Backup")}</button>
            </div>

            {llmLoading && <p className="py-6 text-sm text-white/60" role="status">{ui("Loading LLM configuration…")}</p>}
            {llmError && <div className="py-6 text-sm" role="alert"><p>{ui(llmError)}</p><button className="mt-3 underline" onClick={() => { setLlmLoading(true); setLlmError(""); setLlmRevision(value => value + 1); }}>{ui("Coba lagi")}</button></div>}
            <div className="py-6 space-y-4">
              {providers.map((p, i) => {
                const test = testResults[i];
                return (
                  <div key={i} className="p-4 rounded-lg border border-white/[.06] bg-black/30 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#74FA6A] font-semibold">{i === 0 ? "1. " + ui("Primary provider") : `${i + 1}. Backup ${i}`}</span>
                      <div className="flex items-center gap-1">
                        <button aria-label={ui("Move provider up")} onClick={() => moveProvider(i, -1)} disabled={i === 0 || llmSaving || Object.values(testResults).some(t => t.testing)} className="p-1 text-white/30 hover:text-white disabled:opacity-20"><ArrowUp size={12} /></button>
                        <button aria-label={ui("Move provider down")} onClick={() => moveProvider(i, 1)} disabled={i === providers.length - 1 || llmSaving || Object.values(testResults).some(t => t.testing)} className="p-1 text-white/30 hover:text-white disabled:opacity-20"><ArrowDown size={12} /></button>
                        {providers.length > 1 && (
                          <button aria-label={ui("Remove provider")} disabled={llmSaving || Object.values(testResults).some(t => t.testing)} onClick={() => removeProvider(i)} className="p-1 text-white/30 hover:text-red-400"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10.5px] font-mono text-white/40">Base URL</label>
                        <input
                          type="text"
                          disabled={llmSaving}
                          aria-label={`Base URL · ${i + 1}`}
                          value={p.baseUrl}
                          onChange={(e) => updateProvider(i, { baseUrl: e.target.value })}
                          className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white font-mono focus:border-[#74FA6A]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-mono text-white/40">API Key</label>
                        <div className="relative mt-1">
                          <input
                            disabled={llmSaving} type={showApiKeys[i] ? "text" : "password"}
                            aria-label={`API Key · ${i + 1}`}
                            value={p.apiKey}
                            onChange={(e) => updateProvider(i, { apiKey: e.target.value })}
                            placeholder={p.apiKeySet ? ui("Tersimpan") : "sk-..."}
                            className="w-full rounded border border-white/10 bg-black px-2 py-1 pr-7 text-xs text-white font-mono focus:border-[#74FA6A]/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label={showApiKeys[i] ? ui("Hide API key") : ui("Show API key")}
                            onClick={() => setShowApiKeys((prev) => ({ ...prev, [i]: !prev[i] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                          >
                            {showApiKeys[i] ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono text-white/40">{ui("Models")}</label>
                      <input
                        type="text"
                          disabled={llmSaving}
                        aria-label={`${ui("Models")} · ${i + 1}`}
                        value={p.models}
                        onChange={(e) => updateProvider(i, { models: e.target.value })}
                        className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white font-mono focus:border-[#74FA6A]/50 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={() => testProvider(i)}
                        disabled={test?.testing || llmSaving}
                        className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-xs text-white/60 hover:text-white font-mono"
                      >
                        <Play size={10} className={test?.testing ? "animate-spin" : ""} />
                        <span>{test?.testing ? ui("Testing…") : ui("Test connection")}</span>
                      </button>
                      {test && (
                        <span className={`font-mono text-xs ${test.ok ? "text-[#74FA6A]" : "text-red-400"}`}>
                          {test.ok ? `✓ ${test.model} (${test.latencyMs}ms)` : test.error}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={saveLlm}
                disabled={Object.values(testResults).some(t => t.testing) || llmSaving || ((llmLoading || !!llmError))}
                className="rounded-md bg-[#74FA6A] px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
              >
                {llmSaving ? ui("Menyimpan…") : ui("Simpan Konfigurasi")}
              </button>
            </div>
          </div></>;
}
