"use client";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Ban, Undo2, Sparkles, CircleOff, RefreshCw, Check, Crown } from "lucide-react";
import { isDeveloperAdmin } from "@/lib/admin-access";
import { Shell } from "@/components/brand";
import { AccountWorkbench } from "@/components/account-workbench";
import adminStyles from "@/components/account-workbench.module.css";
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
  return ui(PRO_DURATIONS.find((d) => d.days === days)?.label ?? "{0} hari", days);
}

function fmtDate(iso: string | null): string {
  if (!iso) return ui("belum pernah");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return ui("belum pernah");
  return d.toLocaleString(uiLocale(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TierChip({ tier }: { tier: string }) {
  useUiLanguage();
  if (tier === "pro") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground">
        <Crown size={11} /> Pro
      </span>
    );
  }
  return <span className="inline-flex rounded-full border border-border bg-foreground/[.05] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">free</span>;
}

const DEMO_ACCOUNTS: AccountRow[] = [
  {id:"demo-1",name:"Alya Developer",email:"alya@example.test",tier:"pro",bannedAt:null,createdAt:"2026-09-01T08:00:00Z",proActive:true,proExpiresAt:"2026-10-01T08:00:00Z",isAdmin:false},
  {id:"demo-2",name:"Bima Studio",email:"bima@example.test",tier:"free",bannedAt:null,createdAt:"2026-09-10T08:00:00Z",proActive:false,proExpiresAt:null,isAdmin:false},
  {id:"demo-3",name:"Citra Workspace",email:"citra@example.test",tier:"free",bannedAt:"2026-09-20T08:00:00Z",createdAt:"2026-09-12T08:00:00Z",proActive:false,proExpiresAt:null,isAdmin:false},
  {id:"demo-4",name:"Workspace Admin",email:"admin@example.test",tier:"free",bannedAt:null,createdAt:"2026-09-01T08:00:00Z",proActive:false,proExpiresAt:null,isAdmin:true},
];
export default function AdminUsersPage({ preview = false, embedded = false }: { preview?: boolean; embedded?: boolean }) {
  useUiLanguage();
  const [filter, setFilter] = useState("all");
  const [demoAccounts, setDemoAccounts] = useState(DEMO_ACCOUNTS);
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(preview ? true : null);
  const [accounts, setAccounts] = useState<AccountRow[] | null>(preview ? DEMO_ACCOUNTS : null);
  const [q, setQ] = useState("");
  const [accountPage, setAccountPage] = useState(1);
  const requestRef = useRef<AbortController | null>(null);
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
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const u = await getCurrentUser();
    if (controller.signal.aborted) return;
    const userQs = u?.email ? `userId=${encodeURIComponent(u.email)}` : "";
    const searchQs = search?.trim() ? `q=${encodeURIComponent(search.trim())}` : "";
    const params = [userQs, searchQs].filter(Boolean).join("&");
    const url = params ? `/api/admin/users?${params}` : "/api/admin/users";
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 401 || res.status === 403) {
      setAllowed(false);
      router.replace("/profile");
      return;
    }
    if (!res.ok) throw new Error(ui("Gagal memuat daftar akun"));
    const data = await res.json();
    if (controller.signal.aborted) return;
    setAccountPage(1);
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
      if (u.role !== "admin" || !isDeveloperAdmin(u.email)) {
        router.replace("/profile");
        return;
      }
      setAllowed(true);
      try {
        await loadAccounts();
      } catch {
        if (active) {
          setAccounts([]);
          setToast({ text: ui("Gagal memuat daftar akun"), ok: false });
        }
      }
    });
    return () => {
      active = false;
      requestRef.current?.abort();
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
        setToast({ text: ui("Gagal memuat detail akun"), ok: false });
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
    setToast({text:ui("Simulasi berhasil. Akun asli tidak berubah."),ok:true});
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
        setToast({ text: data.error ?? ui("Aksi gagal"), ok: false });
        return;
      }
      setToast({ text: data.message ?? ui("Aksi berhasil"), ok: true });
      await openDetail(selected.id);
      await loadAccounts(q);
    } finally {
      setBusy(null);
    }
  };

  /** Aksi cepat langsung dari daftar akun: tarik Pro. Berikan Pro lewat card konfirmasi. */
  const quickAction = async (id: string, action: "end-pro") => {
    if (preview) { simulateAction(id,action); return; }
    if (!window.confirm(ui("Akhiri akses Pro akun ini? Akun akan kembali ke Free."))) return;
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
        setToast({ text: data.error ?? ui("Aksi gagal"), ok: false });
        return;
      }
      setToast({ text: data.message ?? ui("Aksi berhasil"), ok: true });
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
        setToast({ text: data.error ?? ui("Aksi gagal"), ok: false });
        return;
      }
      setToast({ text: data.message ?? ui("Aksi berhasil"), ok: true });
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

  const pageCount = Math.max(1, Math.ceil(visibleAccounts.length / 25));
  const currentPage = Math.min(accountPage, pageCount);
  const pageAccounts = visibleAccounts.slice((currentPage - 1) * 25, currentPage * 25);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAccounts(q).catch(error => { if (error.name !== "AbortError") setToast({ text: ui("Pencarian gagal, coba lagi"), ok: false }); });
  };

  if (allowed === null || !allowed) return null;

  return (
    <Shell embedded={embedded} back={preview ? "/preview/profile" : "/profile"} sidebar={false}>
      <AccountWorkbench embedded={embedded} active="users" title={ui("Pengguna")} description={ui("Temukan akun, tinjau pemakaian, lalu kelola aksesnya. Satu daftar untuk seluruh pengguna.")} preview={preview} admin>
        <div className={adminStyles.metrics} aria-label={ui("Ringkasan hasil pencarian")}>
          <div><span>{ui("Akun ditampilkan")}</span><strong>{accounts?.length ?? "—"}</strong></div>
          <div><span>{ui("Paket Free")}</span><strong>{freeList.length}</strong></div>
          <div><span>{ui("Paket Pro")}</span><strong>{proList.length}</strong></div>
          <div><span>{ui("Diblokir")}</span><strong>{bannedCount}</strong></div>
        </div>
        {/* Pencarian */}
        <form onSubmit={onSearch} className="mt-6 flex gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={ui("Cari pengguna")} placeholder={ui("Cari berdasarkan email atau nama")}
              className="w-full rounded-[12px] border border-border bg-background py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-[12px] bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary active:scale-[.985]">{ui("Cari")}</button>
          <button type="button" onClick={() => { setQ(""); setFilter("all"); setSelected(null); void loadAccounts("").catch(() => setToast({text:ui("Gagal memuat akun."),ok:false})); }} className="border border-border px-3 text-xs">{ui("Reset")}</button>
        </form>

        {/* Card konfirmasi durasi Pro: terbuka saat admin menekan Berikan Pro */}
        {grantTarget && (
          <section className="mt-4 rounded-[16px] border border-primary/35 bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-[12px] border border-primary/30 bg-primary/[.08] text-primary">
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold text-foreground">{ui("Berikan akses Pro")}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{grantTarget.name || grantTarget.email} · {grantTarget.email}</p>
                </div>
              </div>
              <button onClick={() => setGrantTarget(null)} className="rounded-full border border-border px-3 py-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground">{ui("Batal")}</button>
            </div>
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{ui("pilih masa aktif")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PRO_DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setGrantDays(d.days)}
                  className={`rounded-[12px] border px-3 py-2.5 text-left transition ${
                    grantDays === d.days
                      ? "border-primary bg-primary/[.12]"
                      : "border-border hover:border-border"
                  }`}
                >
                  <span className={`block text-[13px] font-semibold ${grantDays === d.days ? "text-primary" : "text-foreground"}`}>{ui(d.label)}</span>
                  <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-muted-foreground">{ui("{0} hari", d.days)}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <button
                onClick={confirmGrant}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary active:scale-[.985] disabled:opacity-50"
              >
                <Check size={14} /> {busy === `${grantTarget.id}:grant-pro` ? ui("Memproses…") : `Confirm · ${durationLabel(grantDays)}`}
              </button>
              <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{grantDays}{ui("hari sejak sekarang")}</p>
            </div>
          </section>
        )}

        {toast && (
          <div role="status" className={`mt-4 rounded-[12px] border px-4 py-3 text-[12.5px] ${toast.ok ? "border-primary/30 bg-primary/[.08] text-primary" : "border-destructive0/30 bg-destructive0/[.08] text-destructive"}`}>
            {toast.text}
          </div>
        )}

        <div className={adminStyles.filters} aria-label={ui("Filter akun")}>
          {[["all",ui("Semua")],["free",ui("Free")],["pro","Pro"],["banned",ui("Diblokir")]].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setAccountPage(1); }}>{label}</button>)}
        </div>
        {/* Detail akun terpilih */}
        {loadingDetail && (
          <div className="mt-6 rounded-[16px] border border-border bg-background p-6 text-[13px] text-muted-foreground">{ui("Memuat detail akun…")}</div>
        )}
        {!loadingDetail && selected && (
          <section className="mt-6 rounded-[16px] border border-primary/25 bg-background p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[17px] font-semibold text-foreground">{formatDisplayName(selected.email, selected.name)}</h2>
                  <TierChip tier={selected.tier} />
                  {selected.bannedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive0/30 bg-destructive0/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-destructive">
                      <Ban size={10} /> banned
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-muted-foreground">{selected.email}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{ui("Joined {0}", fmtDate(selected.createdAt))}</p>
                {selected.proActive && (
                  <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-primary">
                    {ui("Pro valid until {0}", selected.proExpiresAt ? fmtDate(selected.proExpiresAt) : ui("tidak terbatas"))}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!selected.proActive && !selected.bannedAt && (
                  <button onClick={() => openGrantConfirm({ id: selected.id, email: selected.email, name: selected.name })} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground transition hover:bg-primary active:scale-[.985] disabled:opacity-50">
                    <Sparkles size={13} />{ui("Berikan akses Pro")}</button>
                )}
                {selected.proActive && (
                  <button onClick={() => runAction("end-pro")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[12.5px] font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50">
                    <CircleOff size={13} /> {busy === "end-pro" ? ui("Memproses…") : ui("Akhiri Pro")}
                  </button>
                )}
                {!selected.bannedAt ? (
                  <button onClick={() => runAction("ban")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full border border-destructive0/30 px-4 py-2 text-[12.5px] font-medium text-destructive transition hover:border-destructive0/60 hover:bg-destructive0/[.06] disabled:opacity-50">
                    <Ban size={13} /> {busy === "ban" ? ui("Memproses…") : ui("Blokir akun")}
                  </button>
                ) : (
                  <button onClick={() => runAction("unban")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-2 text-[12.5px] font-medium text-primary transition hover:bg-primary/[.08] disabled:opacity-50">
                    <Undo2 size={13} /> {busy === "unban" ? ui("Memproses…") : ui("Buka blokir")}
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="inline-flex items-center rounded-full border border-border px-3 py-2 text-[12px] text-muted-foreground transition hover:text-foreground">{ui("Tutup")}</button>
              </div>
            </div>

            {/* Ringkasan angka */}
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border bg-foreground/[.06] md:grid-cols-4">
              <div className="bg-background px-4 py-3.5">
                <p className="font-mono text-[20px] font-semibold tabular-nums text-foreground">{selected.planCount}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-muted-foreground">{ui("plan dibuat")}</p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="font-mono text-[20px] font-semibold tabular-nums text-primary">{selected.proGenerateCount}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-muted-foreground">{ui("generate saat pro")}</p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="font-mono text-[20px] font-semibold tabular-nums text-primary">{selected.freeGenerate24h}<span className="text-[13px] text-muted-foreground"> / {selected.freeLimit}</span></p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-muted-foreground">jatah free 24 jam</p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className={`font-mono text-[20px] font-semibold ${selected.proActive ? "text-primary" : "text-muted-foreground"}`}>{selected.proActive ? "aktif" : "tidak"}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-muted-foreground">status pro</p>
              </div>
            </div>

            {/* Catatan langganan */}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-border bg-background p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">catatan langganan</p>
                <div className="mt-3 space-y-2 text-[12.5px]">
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Pertama kali subscribe Pro</span>
                    <span className="font-mono tabular-nums text-foreground">{fmtDate(selected.firstProAt)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Pro berakhir terakhir</span>
                    <span className="font-mono tabular-nums text-foreground">{selected.lastProEnd ? fmtDate(selected.lastProEnd) : selected.proActive ? "masih aktif" : ui("belum pernah")}</span>
                  </p>
                </div>
              </div>
              <div className="rounded-[12px] border border-border bg-background p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">riwayat periode pro</p>
                {selected.subscriptions.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-muted-foreground">{ui("Akun ini belum pernah berlangganan Pro.")}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {selected.subscriptions.map((s, i) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                        <span className="font-mono text-muted-foreground">#{selected.subscriptions.length - i}</span>
                        <span className="font-mono tabular-nums text-foreground">{fmtDate(s.startedAt)}</span>
                        <span className="text-muted-foreground">sampai</span>
                        <span className="text-right font-mono tabular-nums text-foreground">{s.endedAt ? fmtDate(s.endedAt) : "aktif"}</span>
                        {!s.endedAt && s.expiresAt && (
                          <span className="rounded-full border border-primary bg-primary/[.07] px-2 py-0.5 font-mono text-[10px] tabular-nums text-primary">kedaluwarsa {fmtDate(s.expiresAt)}</span>
                        )}
                        {s.endedAt && !s.expiresAt && s.endedBy && (
                          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{ui("ditarik admin")}</span>
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
        <section className="mt-6 overflow-hidden rounded-[16px] border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">{ui("semua akun")}</p>
            <div className="flex items-center gap-3">
              {accounts !== null && <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{visibleAccounts.length}{ui("akun ditampilkan")}</span>}
              <button
                onClick={() => loadAccounts(q).catch(() => setToast({ text: "Gagal me-refresh", ok: false }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11.5px] text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {accounts === null && <p className="px-5 py-8 text-[13px] text-muted-foreground">{ui("Memuat akun…")}</p>}
          {accounts !== null && visibleAccounts.length === 0 && (
            <p className="px-5 py-8 text-[13px] text-muted-foreground">{ui("Tidak ada akun yang cocok dengan pencarian ini.")}</p>
          )}
          {accounts !== null && visibleAccounts.length > 0 && (
            <ul className="divide-y divide-white/[.05]">
              {pageAccounts.map((a) => {
                const busyKey = `${a.id}:grant-pro`;
                const endKey = `${a.id}:end-pro`;
                return (
                  <li key={a.id} className={adminStyles.userRow}>
                    <button onClick={() => openDetail(a.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{a.email}</p>
                        <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                          {a.name || ui("tanpa nama")} · {ui("Joined {0}", fmtDate(a.createdAt))}
                        </p>
                      </div>
                      <TierChip tier={a.tier} />
                      {a.proActive && (
                        <span className="hidden rounded-full border border-primary bg-primary/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] tabular-nums text-primary sm:inline-flex">
                          {a.proExpiresAt ? ui("Pro valid until {0}", fmtDate(a.proExpiresAt)) : ui("subs aktif")}
                        </span>
                      )}
                      {a.bannedAt && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive0/30 bg-destructive0/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-destructive">
                          <Ban size={10} /> banned
                        </span>
                      )}
                      {a.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-primary">admin</span>
                      )}
                    </button>
                    {!a.isAdmin && !a.bannedAt && (
                      <div className="flex shrink-0 items-center gap-2">
                        {a.tier === "pro" || a.proActive ? (
                          <button
                            onClick={() => quickAction(a.id, "end-pro")}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
                            title={ui("Tarik akses Pro, akun kembali ke Free")}
                          >
                            <CircleOff size={12} /> {busy === endKey ? "…" : ui("Tarik Pro")}
                          </button>
                        ) : (
                          <button
                            onClick={() => openGrantConfirm(a)}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/[.08] px-3 py-1.5 text-[11.5px] font-semibold text-primary transition hover:bg-primary/[.14] disabled:opacity-50"
                            title={ui("Berikan akses Pro: pilih masa aktif lalu confirm")}
                          >
                            <Sparkles size={12} /> {busy === busyKey ? "…" : ui("Berikan Pro")}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {pageCount > 1 && <nav aria-label={ui("User list pages")} className="flex items-center justify-between gap-4 border-t border-border px-4 py-4 text-xs"><span>{ui("Page {0} of {1}", currentPage, pageCount)}</span><div className="flex gap-3"><button className="min-h-10 px-3 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setAccountPage(currentPage - 1)}>{ui("Previous")}</button><button className="min-h-10 px-3 disabled:opacity-40" disabled={currentPage === pageCount} onClick={() => setAccountPage(currentPage + 1)}>{ui("Next")}</button></div></nav>}
        </section>
      </AccountWorkbench>
    </Shell>
  );
}
