"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Bot, Globe2, RefreshCw, ShieldAlert, ShieldCheck, UserX, Undo2 } from "lucide-react";
import { Shell } from "@/components/brand";
import { getCurrentUser } from "@/lib/current-user";

type SecurityEvent = {
  id: string;
  type: string;
  detail: Record<string, unknown>;
  dismissed: boolean;
  ip: string | null;
  ipLabel?: string | null;
  ipIsLocal?: boolean;
  ipGeo?: string | null;
  ua: string | null;
  uaBrowser: string | null;
  uaOs: string | null;
  uaKind: string | null;
  userId: string | null;
  userEmail: string | null;
  createdAt: string;
};

type BlockedIp = {
  id: string;
  ip: string;
  reason: string;
  blockedBy: string | null;
  createdAt: string;
  expiresAt: string | null;
};

type Stats = {
  window24h: { total: number };
  byType: { type: string; count: number }[];
  topIps: { ip: string; label: string | null; isLocal: boolean; geo: string | null; count: number }[];
  topUsers: { userId: string; email: string; count: number }[];
};

const TYPE_LABEL: Record<string, string> = {
  auth_failed: "Auth gagal",
  access_denied: "Akses ditolak",
  rate_limited: "Kena rate limit",
  quota_exhausted: "Kuota habis",
  generate: "Generate plan",
  generate_tasks: "Generate tasks",
  idea_submitted: "Ide dikirim",
  structure_deleted: "Hapus struktur",
  plan_deleted: "Hapus plan",
  admin_action: "Aksi admin",
  ip_blocked: "IP diblokir",
  ip_unblocked: "Blokir dicabut",
  user_reset: "Reset user",
  event_dismissed: "False positive",
};

const KIND_STYLE: Record<string, string> = {
  browser: "border-emerald-400/30 text-emerald-300",
  cli: "border-amber-400/40 text-amber-300",
  bot: "border-red-400/40 text-red-300",
  unknown: "border-white/15 text-white/40",
};

const KIND_LABEL: Record<string, string> = {
  browser: "Browser",
  cli: "CLI/Tool",
  bot: "Bot",
  unknown: "Unknown",
};

function fmtTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function TypeBadge({ type }: { type: string }) {
  const danger = type === "auth_failed" || type === "rate_limited";
  const warn = type === "access_denied" || type === "quota_exhausted";
  const cls = danger
    ? "border-red-400/40 bg-red-400/10 text-red-300"
    : warn
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-white/[.04] text-white/60";
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium border ${cls}`}>{TYPE_LABEL[type] ?? type}</span>;
}

export default function AdminSecurityPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [blocked, setBlocked] = useState<BlockedIp[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [localNote, setLocalNote] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = typeFilter ? `?type=${encodeURIComponent(typeFilter)}&limit=120` : "?limit=120";
      const res = await fetch(`/api/admin/security${qs}`, { credentials: "include" });
      const d = await res.json().catch(() => null);
      if (res.ok && d) {
        setEvents(d.events ?? []);
        setStats(d.stats ?? null);
        setBlocked(d.blockedIps ?? []);
        setLocalNote(d.localNote ?? null);
      } else {
        setEvents([]);
        setStats(null);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      const isAdmin = user?.role === "admin";
      if (!active) return;
      setAllowed(isAdmin);
      if (isAdmin) void load();
      else router.replace("/");
    })();
    return () => {
      active = false;
    };
  }, [router, load]);

  /** Aksi respons: POST ke /api/admin/security dengan jenis aksi. */
  const act = useCallback(async (action: string, payload: Record<string, unknown>, label: string) => {
    setBusy(label);
    setNote(null);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setNote(d?.error ?? "Aksi gagal.");
        return;
      }
      setNote(`${label}: ${d?.blocked ?? d?.unblocked ?? d?.revokedTokens ?? ""} ✓`.replace(" :  ", ": ").trim());
      void load();
    } catch {
      setNote("Aksi gagal diproses.");
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (allowed === null) {
    return (
      <Shell sidebar={false}>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#74FA6A]" />
        </div>
      </Shell>
    );
  }
  if (!allowed) return null;

  const signs24h = stats ? stats.byType.filter((r) => r.type === "auth_failed" || r.type === "rate_limited" || r.type === "access_denied").reduce((a, r) => a + r.count, 0) : 0;

  return (
    <Shell sidebar={false}>
      <div className="mx-auto max-w-[1200px] px-5 pt-10 pb-20 md:px-10 md:pt-16">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/users" className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-[#74FA6A] transition-colors">
            <ArrowLeft size={12} /> Kembali ke admin
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-white md:text-3xl">
                <ShieldCheck size={22} className="text-[#74FA6A]" />
                Pusat Keamanan
              </h1>
              <p className="mt-1.5 text-sm text-white/45">Deteksi serangan, lalu bertindak: blokir IP, reset user, atau tandai false positive.</p>
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-[#74FA6A] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#5FE456] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Memuat…" : "Refresh"}
            </button>
          </div>
        </div>

        {note && <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/[.06] px-3 py-2 text-xs text-amber-200">{note}</p>}

        {/* IP terblokir (hasil aksi) — tampil bila ada */}
        {blocked.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-400/25 bg-red-400/[.04] p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-300">
              <Ban size={14} /> IP Terblokir ({blocked.length})
            </h2>
            <div className="mt-2 space-y-1.5">
              {blocked.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs">
                  <span className="font-mono text-white/80">{b.ip}</span>
                  <span className="text-white/35">{b.reason || "tanpa alasan"} · {fmtTime(b.createdAt)}{b.expiresAt ? ` · sampai ${fmtTime(b.expiresAt)}` : " · permanen"}</span>
                  <button
                    onClick={() => void act("unblock_ip", { ip: b.ip }, "Blokir dicabut")}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/60 hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    <Undo2 size={11} /> Cabut
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistik 24 jam */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Kejadian 24 jam</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.window24h.total}</p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Tanda serangan 24 jam</p>
              <p className={`mt-1 text-2xl font-semibold ${signs24h > 0 ? "text-amber-300" : "text-white"}`}>{signs24h}</p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">IP paling aktif</p>
              {stats.topIps[0] ? (
                <>
                  <p className="mt-1 truncate text-sm font-medium text-white">
                    {stats.topIps[0].ip}
                    {stats.topIps[0].label ? <span className="ml-1.5 rounded bg-white/[.07] px-1.5 py-0.5 text-[9px] text-white/50">{stats.topIps[0].label}</span> : null}
                  </p>
                  {stats.topIps[0].geo ? (
                    <p className="flex items-center gap-1 text-[10px] text-white/35"><Globe2 size={10} /> {stats.topIps[0].geo}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-sm text-white/30">—</p>
              )}
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Akun paling aktif</p>
              {stats.topUsers[0] ? (
                <>
                  <p className="mt-1 truncate text-sm font-medium text-white">{stats.topUsers[0].email}</p>
                  <p className="text-[10px] text-white/35">{stats.topUsers[0].count} kejadian</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-white/30">—</p>
              )}
            </div>
          </div>
        )}

        {/* Catatan localhost */}
        {localNote && events.some((e) => e.ipIsLocal) && (
          <p className="mb-6 rounded-lg border border-sky-400/25 bg-sky-400/[.06] px-3 py-2 text-xs text-sky-200/90">{localNote}</p>
        )}

        {/* Breakdown per jenis */}
        {stats && stats.byType.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white/70">Breakdown 24 jam</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.byType.map((r) => (
                <button
                  key={r.type}
                  onClick={() => setTypeFilter(typeFilter === r.type ? "" : r.type)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    typeFilter === r.type ? "border-[#74FA6A]/60 bg-[#74FA6A]/10 text-[#74FA6A]" : "border-white/10 bg-white/[.03] text-white/60 hover:border-white/25"
                  }`}
                >
                  {TYPE_LABEL[r.type] ?? r.type} <span className="font-semibold">{r.count}</span>
                </button>
              ))}
              {typeFilter && (
                <button onClick={() => setTypeFilter("")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:text-white">
                  Semua
                </button>
              )}
            </div>
          </div>
        )}

        {/* Log kejadian dengan kolom client (UA/geo) + tombol aksi */}
        <div>
          <h2 className="text-sm font-semibold text-white/70">Kejadian terbaru {typeFilter ? `(filter: ${TYPE_LABEL[typeFilter] ?? typeFilter})` : ""}</h2>
          {loading ? (
            <p className="mt-4 text-sm text-white/35">Memuat log…</p>
          ) : events.length === 0 ? (
            <p className="mt-4 text-sm text-white/35">Belum ada kejadian tercatat.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/[.06]">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="border-b border-white/[.08] bg-white/[.02] text-[10px] uppercase tracking-wider text-white/35">
                  <tr>
                    <th className="px-3 py-2.5">Waktu</th>
                    <th className="px-3 py-2.5">Jenis</th>
                    <th className="px-3 py-2.5">Client (bot vs manusia)</th>
                    <th className="px-3 py-2.5">IP / lokasi</th>
                    <th className="px-3 py-2.5">Akun</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.04]">
                  {events.map((e) => {
                    const kind = e.uaKind ?? "unknown";
                    return (
                      <tr key={e.id} className={`align-top ${e.dismissed ? "opacity-40" : ""}`}>
                        <td className="whitespace-nowrap px-3 py-2 text-white/40">{fmtTime(e.createdAt)}</td>
                        <td className="px-3 py-2">
                          <TypeBadge type={e.type} />
                          {e.dismissed && <span className="ml-1.5 text-[9px] text-white/35">false positive</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${KIND_STYLE[kind] ?? KIND_STYLE.unknown}`}>
                              {kind === "bot" || kind === "cli" ? <Bot size={10} /> : null}
                              {KIND_LABEL[kind] ?? "Unknown"}
                              {e.uaBrowser ? ` · ${e.uaBrowser}` : ""}
                              {e.uaOs ? ` · ${e.uaOs}` : ""}
                            </span>
                            {e.ua && <span className="max-w-[220px] truncate text-[9px] text-white/25" title={e.ua}>{e.ua}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-white/50">
                              {e.ip ?? "—"}
                              {e.ipLabel ? <span className="ml-1.5 rounded bg-white/[.07] px-1.5 py-0.5 text-[9px] text-white/50">{e.ipLabel}</span> : null}
                            </span>
                            {e.ipGeo ? (
                              <span className="flex items-center gap-1 text-[10px] text-white/35"><Globe2 size={10} /> {e.ipGeo}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-white/50">{e.userEmail ?? "anonim"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            {/* Blokir IP: hanya IP publik yang belum diblokir */}
                            {e.ip && !e.ipIsLocal && !blocked.some((b) => b.ip === e.ip) && (
                              <button
                                title={`Blokir IP ${e.ip}`}
                                disabled={busy !== null}
                                onClick={() => {
                                  if (window.confirm(`Blokir IP ${e.ip}? Semua request dari IP ini akan ditolak 403.`)) {
                                    void act("block_ip", { ip: e.ip, reason: `Dari event ${e.id.slice(0, 8)} (${e.type})` }, `IP ${e.ip} diblokir`);
                                  }
                                }}
                                className="rounded p-1 text-white/30 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
                              >
                                <Ban size={13} />
                              </button>
                            )}
                            {/* Reset user: cabut semua token user ini */}
                            {e.userId && (
                              <button
                                title="Reset user: cabut semua token API milik akun ini"
                                disabled={busy !== null}
                                onClick={() => {
                                  if (window.confirm(`Reset user ${e.userEmail ?? e.userId}? Semua token API-nya dicabut (CLI harus login ulang).`)) {
                                    void act("reset_user", { userId: e.userId }, `User ${e.userEmail ?? "tersebut"} direset`);
                                  }
                                }}
                                className="rounded p-1 text-white/30 transition hover:bg-amber-400/10 hover:text-amber-300 disabled:opacity-40"
                              >
                                <UserX size={13} />
                              </button>
                            )}
                            {/* False positive: keluarkan dari hitungan serangan */}
                            {!e.dismissed && (
                              <button
                                title="Tandai false positive (tidak dihitung sebagai serangan)"
                                disabled={busy !== null}
                                onClick={() => void act("dismiss_event", { eventId: e.id }, "Ditandai false positive")}
                                className="rounded p-1 text-white/30 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                              >
                                <Undo2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center gap-2 border-t border-white/[.06] pt-6 text-[11px] text-white/30">
          <ShieldAlert size={13} />
          Semua aksi di halaman ini tercatat di audit log (ip_blocked, user_reset, event_dismissed) beserta email pelakunya.
        </div>
      </div>
    </Shell>
  );
}
