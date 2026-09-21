"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Ban, Undo2, Sparkles, CircleOff, RefreshCw, Check, Crown } from "lucide-react";
import { Shell } from "@/components/brand";
import { AccountWorkbench } from "@/components/account-workbench";
import ui from "@/components/account-workbench.module.css";
import { getCurrentUser } from "@/lib/current-user";
import { formatDisplayName } from "@/lib/user-utils";

type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  bannedAt: string | null;
  createdAt: string;
  proActive: boolean;
  proExpiresAt: string | null;
  isAdmin: boolean;
};

type Subscription = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string | null;
  grantedBy: string | null;
  endedBy: string | null;
};

type AccountDetail = {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  bannedAt: string | null;
  createdAt: string;
  firstProAt: string | null;
  lastProEnd: string | null;
  proActive: boolean;
  proExpiresAt: string | null;
  proGenerateCount: number;
  freeGenerate24h: number;
  freeLimit: number;
  planCount: number;
  subscriptions: Subscription[];
};

/** Durasi Pro yang bisa diberikan admin. 1 bulan = 31 hari, 3 bulan = 93 hari. */
const PRO_DURATIONS = [
  { days: 7, label: "7 hari" },
  { days: 14, label: "14 hari" },
  { days: 28, label: "28 hari" },
  { days: 31, label: "1 bulan" },
  { days: 93, label: "3 bulan" },
];

function durationLabel(days: number): string {
  return PRO_DURATIONS.find((d) => d.days === days)?.label ?? `${days} hari`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "belum pernah";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "belum pernah";
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TierChip({ tier }: { tier: string }) {
  if (tier === "pro") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#74FA6A] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-black">
        <Crown size={11} /> Pro
      </span>
    );
  }
  return <span className="inline-flex rounded-full border border-white/12 bg-white/[.05] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-white/45">free</span>;
}

const DEMO_ACCOUNTS: AccountRow[] = [
  {id:"demo-1",name:"Alya Developer",email:"alya@example.test",tier:"pro",bannedAt:null,createdAt:"2026-09-01T08:00:00Z",proActive:true,proExpiresAt:"2026-10-01T08:00:00Z",isAdmin:false},
  {id:"demo-2",name:"Bima Studio",email:"bima@example.test",tier:"free",bannedAt:null,createdAt:"2026-09-10T08:00:00Z",proActive:false,proExpiresAt:null,isAdmin:false},
  {id:"demo-3",name:"Citra Workspace",email:"citra@example.test",tier:"free",bannedAt:"2026-09-20T08:00:00Z",createdAt:"2026-09-12T08:00:00Z",proActive:false,proExpiresAt:null,isAdmin:false},
  {id:"demo-4",name:"Workspace Admin",email:"admin@example.test",tier:"free",bannedAt:null,createdAt:"2026-09-01T08:00:00Z",proActive:false,proExpiresAt:null,isAdmin:true},
];
export default function AdminUsersPage({ preview = false }: { preview?: boolean }) {
  const [filter, setFilter] = useState("all");
  const [demoAccounts, setDemoAccounts] = useState(DEMO_ACCOUNTS);
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(preview ? true : null);
  const [accounts, setAccounts] = useState<AccountRow[] | null>(preview ? DEMO_ACCOUNTS : null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AccountDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  /** Durasi Pro yang dipilih admin di card konfirmasi. Default 1 bulan (31 hari). */
  const [grantDays, setGrantDays] = useState<number>(31);
  /** Akun yang sedang menunggu konfirmasi durasi Pro. Card terbuka selama terisi. */
  const [grantTarget, setGrantTarget] = useState<{ id: string; email: string; name: string | null } | null>(null);

  const loadAccounts = useCallback(async (search?: string) => {
    if (preview) { setAccounts(demoAccounts.filter(a => `${a.name} ${a.email}`.toLowerCase().includes((search || "").toLowerCase()))); return; }
    const u = await getCurrentUser();
    const userQs = u?.email ? `userId=${encodeURIComponent(u.email)}` : "";
    const searchQs = search?.trim() ? `q=${encodeURIComponent(search.trim())}` : "";
    const params = [userQs, searchQs].filter(Boolean).join("&");
    const url = params ? `/api/admin/users?${params}` : "/api/admin/users";
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) {
      setAllowed(false);
      router.replace("/profile");
      return;
    }
    if (!res.ok) throw new Error("Gagal memuat daftar akun");
    const data = await res.json();
    setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    setAllowed(true);
  }, [preview, demoAccounts, router]);

  useEffect(() => {
    if (preview) return;
    let active = true;
    getCurrentUser().then(async (u) => {
      if (!active) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.role !== "admin") {
        router.replace("/profile");
        return;
      }
      try {
        await loadAccounts();
      } catch {
        if (active) {
          setAllowed(false);
          router.replace("/profile");
        }
      }
    });
    return () => {
      active = false;
    };
  }, [router, loadAccounts, preview]);

  const openDetail = useCallback(async (id: string) => {
    if (preview) { const a = demoAccounts.find(a => a.id === id); if (a) setSelected({...a,firstProAt:a.proActive ? a.createdAt : null,lastProEnd:null,proGenerateCount:a.proActive ? 8 : 0,freeGenerate24h:1,freeLimit:3,planCount:3,subscriptions:[]}); return; }
    setLoadingDetail(true);
    try {
      const u = await getCurrentUser();
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      const res = await fetch(`/api/admin/users/${id}${qs}`);
      if (!res.ok) {
        setToast({ text: "Gagal memuat detail akun", ok: false });
        return;
      }
      const data = await res.json();
      setSelected(data.account);
    } finally {
      setLoadingDetail(false);
    }
  }, [preview, demoAccounts]);

  function simulateAction(id: string, action: string) {
    const patch = action === "grant-pro" ? {tier:"pro",proActive:true,proExpiresAt:new Date(Date.now()+grantDays*86400000).toISOString()} : action === "end-pro" ? {tier:"free",proActive:false,proExpiresAt:null} : {bannedAt:action === "ban" ? new Date().toISOString() : null};
    setDemoAccounts(list => list.map(a => a.id === id ? {...a,...patch} : a));
    setAccounts(list => list?.map(a => a.id === id ? {...a,...patch} : a) ?? []);
    setSelected(a => a?.id === id ? {...a,...patch} : a);
    setGrantTarget(null);
    setToast({text:"Simulasi berhasil. Akun asli tidak berubah.",ok:true});
  }

  const runAction = async (action: string) => {
    if (!selected) return;
    if (preview) { simulateAction(selected.id, action); return; }
    if ((action === "ban" || action === "end-pro") && !window.confirm(`Lanjutkan ${action === "ban" ? "blokir akun" : "akhiri Pro"} untuk ${selected.email}?`)) return;
    setBusy(action);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "grant-pro" ? { action, days: grantDays } : { action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast({ text: data.error ?? "Aksi gagal", ok: false });
        return;
      }
      setToast({ text: data.message ?? "Aksi berhasil", ok: true });
      await openDetail(selected.id);
      await loadAccounts(q);
    } finally {
      setBusy(null);
    }
  };

  /** Aksi cepat langsung dari daftar akun: tarik Pro. Berikan Pro lewat card konfirmasi. */
  const quickAction = async (id: string, action: "end-pro") => {
    if (preview) { simulateAction(id,action); return; }
    if (!window.confirm("Akhiri akses Pro akun ini? Akun akan kembali ke Free.")) return;
    const key = `${id}:${action}`;
    setBusy(key);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast({ text: data.error ?? "Aksi gagal", ok: false });
        return;
      }
      setToast({ text: data.message ?? "Aksi berhasil", ok: true });
      await loadAccounts(q);
      if (selected?.id === id) await openDetail(id);
    } finally {
      setBusy(null);
    }
  };

  /** Buka card konfirmasi durasi Pro untuk satu akun. */
  const openGrantConfirm = (a: { id: string; email: string; name: string | null }) => {
    setGrantTarget({ id: a.id, email: a.email, name: a.name });
    setGrantDays(31);
  };

  /** Kirim Pro dengan durasi terpilih, lalu tutup card konfirmasi. */
  const confirmGrant = async () => {
    if (!grantTarget) return;
    if (preview) { simulateAction(grantTarget.id,"grant-pro"); return; }
    const id = grantTarget.id;
    const key = `${id}:grant-pro`;
    setBusy(key);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant-pro", days: grantDays }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast({ text: data.error ?? "Aksi gagal", ok: false });
        return;
      }
      setToast({ text: data.message ?? "Aksi berhasil", ok: true });
      setGrantTarget(null);
      await loadAccounts(q);
      if (selected?.id === id) await openDetail(id);
    } finally {
      setBusy(null);
    }
  };

  /** Pengelompokan akun sesuai langganan: pro aktif vs free (termasuk banned & admin). */
  const proList = accounts?.filter((a) => a.tier === "pro" || a.proActive) ?? [];
  const freeList = accounts?.filter((a) => a.tier !== "pro" && !a.proActive) ?? [];
  const bannedCount = accounts?.filter((a) => a.bannedAt).length ?? 0;

  const visibleAccounts = accounts?.filter(a => filter === "all" || (filter === "banned" ? !!a.bannedAt : filter === "pro" ? a.proActive || a.tier === "pro" : !a.proActive && a.tier !== "pro")) ?? [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAccounts(q).catch(() => setToast({ text: "Pencarian gagal, coba lagi", ok: false }));
  };

  if (allowed === null || !allowed) return null;

  return (
    <Shell back={preview ? "/preview/profile" : "/profile"} sidebar={false}>
      <AccountWorkbench active="users" title="Pengguna" description="Temukan akun, tinjau pemakaian, lalu kelola aksesnya. Satu daftar untuk seluruh pengguna." preview={preview} admin>
        <div className={ui.metrics} aria-label="Ringkasan hasil pencarian">
          <div><span>Akun ditampilkan</span><strong>{accounts?.length ?? "—"}</strong></div>
          <div><span>Paket Free</span><strong>{freeList.length}</strong></div>
          <div><span>Paket Pro</span><strong>{proList.length}</strong></div>
          <div><span>Diblokir</span><strong>{bannedCount}</strong></div>
        </div>
        {/* Pencarian */}
        <form onSubmit={onSearch} className="mt-6 flex gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Cari pengguna" placeholder="Cari berdasarkan email atau nama"
              className="w-full rounded-[12px] border border-white/10 bg-[#101417] py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-white/25 focus:border-[#74FA6A]/50 focus:outline-none"
            />
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#74FA6A] px-5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]">
            Cari
          </button>
          <button type="button" onClick={() => { setQ(""); setFilter("all"); setSelected(null); void loadAccounts("").catch(() => setToast({text:"Gagal memuat akun.",ok:false})); }} className="border border-white/15 px-3 text-xs">Reset</button>
        </form>

        {/* Card konfirmasi durasi Pro: terbuka saat admin menekan Berikan Pro */}
        {grantTarget && (
          <section className="mt-4 rounded-[16px] border border-[#74FA6A]/35 bg-[#101417] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-[12px] border border-[#74FA6A]/30 bg-[#74FA6A]/[.08] text-[#74FA6A]">
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold text-white">Berikan akses Pro</p>
                  <p className="mt-0.5 text-[12px] text-[#8C97A5]">{grantTarget.name || grantTarget.email} · {grantTarget.email}</p>
                </div>
              </div>
              <button onClick={() => setGrantTarget(null)} className="rounded-full border border-white/10 px-3 py-1.5 text-[11.5px] text-white/50 transition hover:text-white">
                Batal
              </button>
            </div>
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-white/35">pilih masa aktif</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PRO_DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setGrantDays(d.days)}
                  className={`rounded-[12px] border px-3 py-2.5 text-left transition ${
                    grantDays === d.days
                      ? "border-[#74FA6A] bg-[#74FA6A]/[.12]"
                      : "border-white/12 hover:border-white/25"
                  }`}
                >
                  <span className={`block text-[13px] font-semibold ${grantDays === d.days ? "text-[#74FA6A]" : "text-white"}`}>{d.label}</span>
                  <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-white/35">{d.days} hari</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <button
                onClick={confirmGrant}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985] disabled:opacity-50"
              >
                <Check size={14} /> {busy === `${grantTarget.id}:grant-pro` ? "Memproses…" : `Confirm · ${durationLabel(grantDays)}`}
              </button>
              <p className="font-mono text-[10.5px] tabular-nums text-white/30">{grantDays} hari sejak sekarang</p>
            </div>
          </section>
        )}

        {toast && (
          <div role="status" className={`mt-4 rounded-[12px] border px-4 py-3 text-[12.5px] ${toast.ok ? "border-[#74FA6A]/30 bg-[#74FA6A]/[.08] text-[#74FA6A]" : "border-red-500/30 bg-red-500/[.08] text-red-400"}`}>
            {toast.text}
          </div>
        )}

        <div className={ui.filters} aria-label="Filter akun">
          {[["all","Semua"],["free","Free"],["pro","Pro"],["banned","Diblokir"]].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
        {/* Detail akun terpilih */}
        {loadingDetail && (
          <div className="mt-6 rounded-[16px] border border-white/[.08] bg-[#101417] p-6 text-[13px] text-white/40">
            Memuat detail akun…
          </div>
        )}
        {!loadingDetail && selected && (
          <section className="mt-6 rounded-[16px] border border-[#74FA6A]/25 bg-[#101417] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[17px] font-semibold text-white">{formatDisplayName(selected.email, selected.name)}</h2>
                  <TierChip tier={selected.tier} />
                  {selected.bannedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-red-400">
                      <Ban size={10} /> banned
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-[#8C97A5]">{selected.email}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-white/30">terdaftar {fmtDate(selected.createdAt)}</p>
                {selected.proActive && (
                  <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-sky-300/80">
                    masa aktif pro sampai {selected.proExpiresAt ? fmtDate(selected.proExpiresAt) : "tidak terbatas"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!selected.proActive && !selected.bannedAt && (
                  <button onClick={() => openGrantConfirm({ id: selected.id, email: selected.email, name: selected.name })} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-4 py-2 text-[12.5px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985] disabled:opacity-50">
                    <Sparkles size={13} /> Berikan akses Pro
                  </button>
                )}
                {selected.proActive && (
                  <button onClick={() => runAction("end-pro")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[12.5px] font-medium text-white/80 transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50">
                    <CircleOff size={13} /> {busy === "end-pro" ? "Memproses…" : "Akhiri Pro"}
                  </button>
                )}
                {!selected.bannedAt ? (
                  <button onClick={() => runAction("ban")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 px-4 py-2 text-[12.5px] font-medium text-red-400 transition hover:border-red-500/60 hover:bg-red-500/[.06] disabled:opacity-50">
                    <Ban size={13} /> {busy === "ban" ? "Memproses…" : "Blokir akun"}
                  </button>
                ) : (
                  <button onClick={() => runAction("unban")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full border border-[#74FA6A]/30 px-4 py-2 text-[12.5px] font-medium text-[#74FA6A] transition hover:bg-[#74FA6A]/[.08] disabled:opacity-50">
                    <Undo2 size={13} /> {busy === "unban" ? "Memproses…" : "Buka blokir"}
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="inline-flex items-center rounded-full border border-white/10 px-3 py-2 text-[12px] text-white/50 transition hover:text-white">
                  Tutup
                </button>
              </div>
            </div>

            {/* Ringkasan angka */}
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-white/[.08] bg-white/[.06] md:grid-cols-4">
              <div className="bg-[#0C0E10] px-4 py-3.5">
                <p className="font-mono text-[20px] font-semibold tabular-nums text-white">{selected.planCount}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-white/35">plan dibuat</p>
              </div>
              <div className="bg-[#0C0E10] px-4 py-3.5">
                <p className="font-mono text-[20px] font-semibold tabular-nums text-sky-300">{selected.proGenerateCount}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-white/35">generate saat pro</p>
              </div>
              <div className="bg-[#0C0E10] px-4 py-3.5">
                <p className="font-mono text-[20px] font-semibold tabular-nums text-[#74FA6A]">{selected.freeGenerate24h}<span className="text-[13px] text-white/30"> / {selected.freeLimit}</span></p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-white/35">jatah free 24 jam</p>
              </div>
              <div className="bg-[#0C0E10] px-4 py-3.5">
                <p className={`font-mono text-[20px] font-semibold ${selected.proActive ? "text-[#74FA6A]" : "text-white/40"}`}>{selected.proActive ? "aktif" : "tidak"}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-white/35">status pro</p>
              </div>
            </div>

            {/* Catatan langganan */}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-white/[.06] bg-[#0C0E10] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-white/35">catatan langganan</p>
                <div className="mt-3 space-y-2 text-[12.5px]">
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-[#8C97A5]">Pertama kali subscribe Pro</span>
                    <span className="font-mono tabular-nums text-white">{fmtDate(selected.firstProAt)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-[#8C97A5]">Pro berakhir terakhir</span>
                    <span className="font-mono tabular-nums text-white">{selected.lastProEnd ? fmtDate(selected.lastProEnd) : selected.proActive ? "masih aktif" : "belum pernah"}</span>
                  </p>
                </div>
              </div>
              <div className="rounded-[12px] border border-white/[.06] bg-[#0C0E10] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-white/35">riwayat periode pro</p>
                {selected.subscriptions.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-white/40">Akun ini belum pernah berlangganan Pro.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {selected.subscriptions.map((s, i) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                        <span className="font-mono text-white/40">#{selected.subscriptions.length - i}</span>
                        <span className="font-mono tabular-nums text-white/80">{fmtDate(s.startedAt)}</span>
                        <span className="text-white/25">sampai</span>
                        <span className="text-right font-mono tabular-nums text-white/80">{s.endedAt ? fmtDate(s.endedAt) : "aktif"}</span>
                        {!s.endedAt && s.expiresAt && (
                          <span className="rounded-full border border-sky-400/25 bg-sky-400/[.07] px-2 py-0.5 font-mono text-[10px] tabular-nums text-sky-300">kedaluwarsa {fmtDate(s.expiresAt)}</span>
                        )}
                        {s.endedAt && !s.expiresAt && s.endedBy && (
                          <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/40">ditarik admin</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Tabel akun */}
        <section className="mt-6 overflow-hidden rounded-[16px] border border-white/[.08] bg-[#101417]">
          <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-white/35">semua akun</p>
            <div className="flex items-center gap-3">
              {accounts !== null && <span className="font-mono text-[11px] tabular-nums text-white/40">{visibleAccounts.length} akun ditampilkan</span>}
              <button
                onClick={() => loadAccounts(q).catch(() => setToast({ text: "Gagal me-refresh", ok: false }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11.5px] text-white/60 transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A]"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {accounts === null && <p className="px-5 py-8 text-[13px] text-white/40">Memuat akun…</p>}
          {accounts !== null && visibleAccounts.length === 0 && (
            <p className="px-5 py-8 text-[13px] text-white/40">Tidak ada akun yang cocok dengan pencarian ini.</p>
          )}
          {accounts !== null && visibleAccounts.length > 0 && (
            <ul className="divide-y divide-white/[.05]">
              {visibleAccounts.map((a) => {
                const busyKey = `${a.id}:grant-pro`;
                const endKey = `${a.id}:end-pro`;
                return (
                  <li key={a.id} className={ui.userRow}>
                    <button onClick={() => openDetail(a.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-white">{a.email}</p>
                        <p className="mt-0.5 truncate font-mono text-[10.5px] text-white/30">
                          {a.name || "tanpa nama"} · daftar {fmtDate(a.createdAt)}
                        </p>
                      </div>
                      <TierChip tier={a.tier} />
                      {a.proActive && (
                        <span className="hidden rounded-full border border-sky-400/30 bg-sky-400/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] tabular-nums text-sky-300 sm:inline-flex">
                          {a.proExpiresAt ? `pro s.d. ${fmtDate(a.proExpiresAt)}` : "subs aktif"}
                        </span>
                      )}
                      {a.bannedAt && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-red-400">
                          <Ban size={10} /> banned
                        </span>
                      )}
                      {a.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#74FA6A]/30 bg-[#74FA6A]/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#74FA6A]">admin</span>
                      )}
                    </button>
                    {!a.isAdmin && !a.bannedAt && (
                      <div className="flex shrink-0 items-center gap-2">
                        {a.tier === "pro" || a.proActive ? (
                          <button
                            onClick={() => quickAction(a.id, "end-pro")}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11.5px] font-medium text-white/70 transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
                            title="Tarik akses Pro, akun kembali ke Free"
                          >
                            <CircleOff size={12} /> {busy === endKey ? "…" : "Tarik Pro"}
                          </button>
                        ) : (
                          <button
                            onClick={() => openGrantConfirm(a)}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#74FA6A]/35 bg-[#74FA6A]/[.08] px-3 py-1.5 text-[11.5px] font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/[.14] disabled:opacity-50"
                            title="Berikan akses Pro: pilih masa aktif lalu confirm"
                          >
                            <Sparkles size={12} /> {busy === busyKey ? "…" : "Berikan Pro"}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </AccountWorkbench>
    </Shell>
  );
}
