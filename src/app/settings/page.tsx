"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
import { getCurrentUser } from "@/lib/current-user";

interface TokenInfo { hash: string; label: string; revoked: boolean; createdAt: string }
interface QuotaInfo { remaining: number; limit: number; resetAt: number }
interface LlmCfgInfo { baseUrl: string; model: string; apiKeySet: boolean; apiKeyMasked: string; source: string }

export default function Settings() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [llmCfg, setLlmCfg] = useState<LlmCfgInfo | null>(null);
  const [llmForm, setLlmForm] = useState({ baseUrl: "", apiKey: "", model: "" });
  const [llmSaving, setLlmSaving] = useState(false);
  const router = useRouter();

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
      fetch(`/api/tokens${qs}`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setTokens(d); });
      fetch(`/api/generate${qs}`).then((r) => r.json()).then((d) => { if (d.remaining !== undefined) setQuota(d); });
      // LLM config: cuma muncul kalau user admin (200). 403 = bukan admin -> sembunyikan.
      fetch(`/api/llm-config${qs}`).then((r) => {
        if (!r.ok) { setLlmCfg(null); return; }
        return r.json();
      }).then((d) => {
        if (d && d.baseUrl !== undefined) {
          setLlmCfg(d);
          setLlmForm((f) => ({ ...f, baseUrl: d.baseUrl ?? "", model: d.model ?? "" }));
        }
      }).catch(() => setLlmCfg(null));
    });
  }

  function saveLlm() {
    setLlmSaving(true);
    getCurrentUser().then((u) => {
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      fetch(`/api/llm-config${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(llmForm),
      }).then((r) => r.json()).then((d) => {
        setLlmSaving(false);
        if (d?.ok) {
          setToast("Konfigurasi LLM disimpan");
          setLlmForm((f) => ({ ...f, apiKey: "" }));
          setTimeout(() => setToast(null), 2000);
          load();
        } else {
          setToast("Gagal menyimpan: " + (d?.error ?? "unknown"));
          setTimeout(() => setToast(null), 2500);
        }
      }).catch(() => { setLlmSaving(false); setToast("Gagal menyimpan"); setTimeout(() => setToast(null), 2000); });
    });
  }

  useEffect(() => { load(); }, []);

  function createToken() {
    getCurrentUser().then((u) => {
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "CLI", userId: u?.email }) })
        .then((r) => r.json())
        .then((d) => { if (d.token) { setNewToken(d.token); load(); } });
    });
  }

  function revoke(hash: string) {
    getCurrentUser().then((u) => {
      fetch("/api/tokens", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hash, userId: u?.email }) })
        .then((r) => r.json())
        .then(() => { setToast("Token dicabut"); setTimeout(() => setToast(null), 2000); load(); });
    });
  }

  return (
    <Shell>
      {!authed ? null : (
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-3xl font-black">Pengaturan</h1>

        <div className="mt-10">
          <h2 className="text-xl">Token &amp; CLI</h2>
          {newToken && (
            <div className="surface mt-4 border-[#74FA6A] p-4">
              <p className="text-sm text-[#74FA6A]">Token baru (tampilkan sekali saja):</p>
              <code className="mt-2 block break-all bg-black/40 p-3 font-mono text-xs">{newToken}</code>
              <button className="btn secondary mt-3" onClick={() => { navigator.clipboard.writeText(newToken); setToast("Token disalin"); setTimeout(() => setToast(null), 2000); }}>Copy</button>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {tokens.map((t) => (
              <div key={t.hash} className="surface flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-xs text-slate-400">{t.hash.slice(0, 16)}...</p>
                  <p className="mt-1 text-sm text-slate-500">{t.label} · {t.revoked ? "dicabut" : "aktif"}</p>
                </div>
                {!t.revoked && <button className="btn secondary" onClick={() => revoke(t.hash)}>Revoke</button>}
              </div>
            ))}
            {tokens.length === 0 && <p className="text-sm text-slate-500">Belum ada token.</p>}
          </div>
          <button className="btn mt-4" onClick={createToken}>Buat token baru</button>
        </div>

        <div className="mt-10">
          <h2 className="text-xl">Pemakaian</h2>
          {quota ? (
            <div className="surface mt-4 p-4">
              <p className="text-sm">Sisa generate Free dalam 24 jam: <b className="text-[#74FA6A]">{quota.remaining}</b> / {quota.limit}</p>
              <p className="mt-1 text-xs text-slate-500">Reset: {new Date(quota.resetAt).toLocaleString("id-ID")}</p>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">Memuat...</p>}
        </div>

        {llmCfg && (
          <div className="mt-10">
            <h2 className="text-xl">Konfigurasi LLM</h2>
            <p className="mt-1 text-xs text-slate-500">
              Sumber aktif: <b className="text-[#74FA6A]">{llmCfg.source === "database" ? "database" : "env (fallback)"}</b>.
              Ganti token/model di sini tanpa perlu redeploy.
            </p>
            <div className="surface mt-4 space-y-4 p-4">
              <div>
                <label className="text-xs text-slate-400">Base URL</label>
                <input className="field mt-1 w-full font-mono text-sm" value={llmForm.baseUrl} onChange={(e) => setLlmForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://provider.ai/v1" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Model</label>
                <input className="field mt-1 w-full font-mono text-sm" value={llmForm.model} onChange={(e) => setLlmForm((f) => ({ ...f, model: e.target.value }))} placeholder="mis. deepseek-chat, gemini-...-flash" />
              </div>
              <div>
                <label className="text-xs text-slate-400">API Key {llmCfg.apiKeySet ? `(sekarang: ${llmCfg.apiKeyMasked})` : "(belum ada)"}</label>
                <input type="password" className="field mt-1 w-full font-mono text-sm" value={llmForm.apiKey} onChange={(e) => setLlmForm((f) => ({ ...f, apiKey: e.target.value }))} placeholder={llmCfg.apiKeySet ? "Kosongkan untuk pakai yang lama" : "Masukkan API key"} />
              </div>
              <button className="btn" onClick={saveLlm} disabled={llmSaving}>{llmSaving ? "Menyimpan..." : "Simpan konfigurasi"}</button>
            </div>
          </div>
        )}
      </section>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 surface border-[#74FA6A] px-4 py-3 text-sm">{toast}</div>
      )}
    </Shell>
  );
}
