"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
import { getCurrentUser } from "@/lib/current-user";

interface TokenInfo { hash: string; label: string; revoked: boolean; createdAt: string }
interface QuotaInfo { remaining: number; limit: number; resetAt: number }

export default function Settings() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
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
              <p className="text-sm">Sisa kuota generate: <b className="text-[#74FA6A]">{quota.remaining}</b> / {quota.limit}</p>
              <p className="mt-1 text-xs text-slate-500">Reset: {new Date(quota.resetAt).toLocaleString("id-ID")}</p>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">Memuat...</p>}
        </div>
      </section>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 surface border-[#74FA6A] px-4 py-3 text-sm">{toast}</div>
      )}
    </Shell>
  );
}
