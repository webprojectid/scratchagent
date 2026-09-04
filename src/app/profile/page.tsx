"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
import {
  LogOut,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
  Crown,
  FolderOpen,
  ChevronRight,
  Loader2,
  Shield,
  Zap,
  Clock,
  Search,
  Copy,
  Check,
  Trash2,
  ArrowUpRight,
  Terminal,
  Calendar,
  CheckCircle2,
  Pencil,
  AlertTriangle,
  X,
  Settings,
  Flame,
  Layers,
} from "lucide-react";
import { getCurrentUser, refreshCurrentUser, supabaseConfigured } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type UserData = {
  email: string;
  name: string;
  role?: string;
  tier?: string;
  createdAt?: string | null;
  proExpiresAt?: string | null;
  proActive?: boolean;
};

type PlanSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string | undefined;
  stack: string[];
  featureCount: number;
  taskCount: number;
  tasksDone: number;
  tasksActive: number;
  tasksFailed: number;
};

type QuotaData = {
  remaining: number;
  limit: number;
  tier: string;
  resetsInMinutes?: number;
};

type TokenItem = {
  hash: string;
  label: string;
  revoked: boolean;
  createdAt?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<UserData | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "active" | "generating">("all");

  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanSummary | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"projects" | "security">("projects");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);

    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.push("/login");
        return;
      }
      setUser((prev) => ({
        email: u.email,
        name: u.name,
        role: u.role || prev?.role,
        tier: prev?.tier,
      }));
    });

    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setUser((prev) =>
          prev
            ? {
                ...prev,
                email: d.email || prev.email,
                name: d.name || prev.name,
                role: d.role ?? prev.role,
                tier: d.tier ?? prev.tier,
                createdAt: d.createdAt ?? prev.createdAt,
                proExpiresAt: d.proExpiresAt ?? prev.proExpiresAt,
                proActive: d.proActive ?? prev.proActive,
              }
            : d,
        );
      })
      .catch(() => {});

    fetch("/api/generate")
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => {
        if (active && q) setQuota(q);
      })
      .catch(() => {});

    fetch("/api/tokens")
      .then((r) => (r.ok ? r.json() : null))
      .then((tList) => {
        if (active && Array.isArray(tList)) setTokens(tList.filter((t) => !t.revoked));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active || !u) return;
      fetch(`/api/plans/list?userId=${encodeURIComponent(u.email ?? "shared")}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) {
            setPlans(d.plans || []);
            setPlansLoading(false);
          }
        })
        .catch(() => {
          if (active) setPlansLoading(false);
        });
    });

    return () => {
      active = false;
    };
  }, []);

  useGSAP(
    () => {
      if (!user) return;
      gsap.from(".gsap-hero", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(".gsap-card", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.15,
      });
    },
    { scope: containerRef, dependencies: [user] },
  );

  const handleLogout = () => {
    localStorage.removeItem("scratch_user");
    refreshCurrentUser();
    if (supabaseConfigured()) {
      createClient()
        .auth.signOut()
        .catch(() => {})
        .finally(() => router.push("/login"));
    } else {
      router.push("/login");
    }
  };

  const handleChangePass = () => {
    if (!user) return;
    if (newPass.length < 6) {
      setMsg("Password minimal 6 karakter.");
      setMsgType("error");
      return;
    }
    const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
    const userKey = user.email.toLowerCase();
    if (storedUsers[userKey]) {
      storedUsers[userKey].password = newPass;
      localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
      setMsg("Password berhasil diubah.");
      setMsgType("success");
      setNewPass("");
      setTimeout(() => setMsg(""), 3000);
    } else {
      setMsg("Akun tidak terdaftar, password tidak bisa disimpan.");
      setMsgType("error");
    }
  };

  const handleSaveName = () => {
    if (!nameInput.trim() || !user) {
      setEditingName(false);
      return;
    }
    const updatedName = nameInput.trim();
    setUser((prev) => (prev ? { ...prev, name: updatedName } : null));

    try {
      const stored = JSON.parse(localStorage.getItem("scratch_user") || "{}");
      stored.name = updatedName;
      localStorage.setItem("scratch_user", JSON.stringify(stored));

      const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
      const userKey = user.email.toLowerCase();
      if (storedUsers[userKey]) {
        storedUsers[userKey].name = updatedName;
        localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
      }
      refreshCurrentUser();
    } catch {}
    setEditingName(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const openDeleteModal = (e: React.MouseEvent, plan: PlanSummary) => {
    e.preventDefault();
    e.stopPropagation();
    setPlanToDelete(plan);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    const planId = planToDelete.id;
    const title = planToDelete.title;
    setDeletingId(planId);
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        setDeleteToast(`Project "${title}" berhasil dihapus.`);
        setTimeout(() => setDeleteToast(null), 3500);
        setPlanToDelete(null);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Gagal menghapus plan");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === "done") return p.status === "done";
      if (statusFilter === "generating") return p.status === "generating";
      if (statusFilter === "active") return p.status !== "done" && p.status !== "generating";
      return true;
    });
  }, [plans, searchQuery, statusFilter]);

  if (!user) return null;

  const initials = (user.name || user.email || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isPro = user.tier === "pro";
  const isAdmin = user.role === "admin" || user.email === "teguhends@gmail.com" || user.email?.startsWith("admin");
  const totalTasks = plans.reduce((a, p) => a + p.taskCount, 0);
  const doneTasks = plans.reduce((a, p) => a + p.tasksDone, 0);
  const donePlansCount = plans.filter((p) => p.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Shell back="/" sidebar={false}>
      <div ref={containerRef} className="mx-auto w-full max-w-[1200px] px-5 pb-24 pt-10 md:px-8 md:pt-14">
        {/* Editorial Wide Hero Architecture (2-line rule) */}
        <section className="gsap-hero relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[#0C0F11] p-6 md:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 size-80 rounded-full bg-[#74FA6A]/[0.03] blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* User Identity Details */}
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] font-mono text-xl font-bold text-[#74FA6A] shadow-inner transition-transform duration-500 group-hover:scale-105">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-[#0C0F11] bg-[#74FA6A]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        autoFocus
                        className="rounded-lg border border-[#74FA6A]/50 bg-black/60 px-2.5 py-1 text-base font-bold text-white focus:outline-none"
                      />
                      <button
                        onClick={handleSaveName}
                        className="rounded-lg bg-[#74FA6A] px-2.5 py-1 text-xs font-bold text-black hover:bg-[#A8FF9B]"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/50 hover:text-white"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-xl font-bold tracking-tight text-white md:text-2xl">
                        {user.name}
                      </h1>
                      <button
                        onClick={() => {
                          setNameInput(user.name);
                          setEditingName(true);
                        }}
                        className="rounded p-1 text-white/30 hover:text-[#74FA6A]"
                        title="Edit nama"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <span className="rounded-md border border-[#74FA6A]/30 bg-[#74FA6A]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#74FA6A]">
                      Admin
                    </span>
                  )}
                  {isPro ? (
                    <span className="flex items-center gap-1 rounded-md border border-[#74FA6A]/40 bg-[#74FA6A]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#74FA6A]">
                      <Crown size={11} /> Pro Tier
                    </span>
                  ) : (
                    <span className="rounded-md border border-white/10 bg-white/[.04] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/40">
                      Free Tier
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-xs text-white/40">
                  <span>{user.email}</span>
                  {user.createdAt && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Sejak {new Date(user.createdAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/new"
                className="flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
              >
                <Plus size={14} /> Plan Baru
              </Link>
              {!isPro && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-1.5 rounded-full border border-[#74FA6A]/40 bg-[#74FA6A]/10 px-4 py-2 text-xs font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/20"
                >
                  <Zap size={13} /> Upgrade Pro
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/users"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-xs font-medium text-white transition hover:border-[#74FA6A]/40 hover:text-[#74FA6A]"
                >
                  <ShieldCheck size={14} /> Developer
                </Link>
              )}
              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
              >
                <Settings size={14} /> Setting
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/[.05] px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
              >
                <LogOut size={13} /> Keluar
              </button>
            </div>
          </div>
        </section>

        {/* Gapless Dense Bento Grid */}
        <section className="mt-8 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Bento Cell 1: Quota Status (Wide span) */}
          <div className="gsap-card col-span-1 rounded-2xl border border-white/[.08] bg-[#0E1214] p-5 md:col-span-2">
            <div className="flex items-center justify-between border-b border-white/[.06] pb-3">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                Status Kapasitas AI
              </span>
              <Flame size={14} className="text-[#74FA6A]" />
            </div>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-3xl font-bold tracking-tight text-[#74FA6A]">
                  {isPro ? "Unlimited" : `${quota?.remaining ?? 3} / 3`}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {isPro ? "Akses generate tanpa batas kuota rolling." : "Jatah generate harian tersisa."}
                </p>
              </div>
              <div className="text-right font-mono text-[11px] text-white/40">
                {isPro ? (
                  <span>Status: Pro Aktif</span>
                ) : (
                  <span>Reset rolling: 24 jam per-generate</span>
                )}
              </div>
            </div>
          </div>

          {/* Bento Cell 2: Execution Rate */}
          <div className="gsap-card col-span-1 rounded-2xl border border-white/[.08] bg-[#0E1214] p-5">
            <div className="flex items-center justify-between border-b border-white/[.06] pb-3">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                Tingkat Selesai
              </span>
              <CheckCircle2 size={14} className="text-[#74FA6A]" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">{completionRate}%</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[.06]">
              <div
                className="h-full rounded-full bg-[#74FA6A] transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[11px] text-white/40">
              {doneTasks} dari {totalTasks} task tuntas
            </p>
          </div>

          {/* Bento Cell 3: Total Projects */}
          <div className="gsap-card col-span-1 rounded-2xl border border-white/[.08] bg-[#0E1214] p-5">
            <div className="flex items-center justify-between border-b border-white/[.06] pb-3">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                Total Projek
              </span>
              <Layers size={14} className="text-white/40" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">{plans.length}</p>
            <p className="mt-2 font-mono text-[11px] text-[#74FA6A]">
              {donePlansCount} project rampung
            </p>
          </div>
        </section>

        {/* CLI Integration Section */}
        <section className="gsap-card mt-6 rounded-2xl border border-white/[.08] bg-[#0E1214] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-4">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-[#74FA6A]" />
              <h2 className="text-sm font-semibold tracking-wide text-white">Koneksi Agent CLI</h2>
            </div>
            <Link
              href="/settings"
              className="font-mono text-xs text-[#74FA6A] hover:underline"
            >
              Kelola Token di Settings →
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-xl text-xs text-white/50 leading-relaxed">
              Jalankan coding agent dari terminal lokal dengan menghubungkan token aktif Anda:
            </p>

            {tokens.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {tokens.slice(0, 2).map((t) => {
                  const cmd = `scratch-agent login --token ${t.hash} --url ${origin || "https://www.scratchagent.web.id"}`;
                  return (
                    <button
                      key={t.hash}
                      onClick={() => handleCopy(cmd, t.hash)}
                      className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-left transition hover:border-[#74FA6A]/40"
                    >
                      <span className="font-mono text-xs text-white/70">{t.label}</span>
                      <span className="font-mono text-[10px] text-white/30">({t.hash.slice(0, 8)}…)</span>
                      {copiedToken === t.hash ? (
                        <Check size={12} className="text-[#74FA6A]" />
                      ) : (
                        <Copy size={12} className="text-white/30 group-hover:text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 font-mono text-xs text-white/40 hover:text-white"
              >
                <Plus size={12} /> Buat token di settings
              </Link>
            )}
          </div>
        </section>

        {/* Tab Selection */}
        <div className="mt-10 flex items-center gap-3 border-b border-white/[.08] pb-3">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "projects" ? "bg-[#74FA6A] text-black" : "text-white/40 hover:text-white"
            }`}
          >
            <FolderOpen size={14} /> Daftar Project ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "security" ? "bg-[#74FA6A] text-black" : "text-white/40 hover:text-white"
            }`}
          >
            <Shield size={14} /> Keamanan &amp; Akun
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "projects" ? (
          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input
                  type="text"
                  placeholder="Cari nama project…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0E1214] py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 focus:border-[#74FA6A]/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0E1214] p-1 font-mono text-xs">
                {(["all", "active", "done", "generating"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-lg px-3 py-1 capitalize transition ${
                      statusFilter === tab ? "bg-[#74FA6A] font-bold text-black" : "text-white/40 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? "Semua" : tab === "active" ? "Berjalan" : tab === "done" ? "Selesai" : "Draft"}
                  </button>
                ))}
              </div>
            </div>

            {plansLoading ? (
              <div className="flex items-center justify-center py-20 text-white/30">
                <Loader2 size={18} className="animate-spin mr-2" />
                <span className="font-mono text-xs">Memuat data project…</span>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/[.06] bg-[#0E1214] py-16 text-center">
                <FolderOpen size={32} className="mx-auto text-white/20" />
                <p className="mt-3 text-sm text-white/40">Tidak ada project yang ditemukan.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                {filteredPlans.map((plan) => {
                  const pct = plan.taskCount > 0 ? Math.round((plan.tasksDone / plan.taskCount) * 100) : 0;
                  return (
                    <Link
                      key={plan.id}
                      href={`/project/${plan.id}`}
                      className="group flex flex-col justify-between gap-4 rounded-xl border border-white/[.06] bg-[#0E1214] p-4 transition hover:border-[#74FA6A]/30 hover:bg-white/[.02] sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <p className="truncate text-sm font-semibold text-white group-hover:text-[#74FA6A]">
                            {plan.title}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                              plan.status === "done"
                                ? "bg-[#74FA6A]/10 text-[#74FA6A]"
                                : plan.status === "generating"
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-white/10 text-white/60"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-white/35">
                          {plan.createdAt && (
                            <span>{new Date(plan.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          <span>•</span>
                          <span>{plan.featureCount} Fase</span>
                          <span>•</span>
                          <span>{plan.tasksDone}/{plan.taskCount} task ({pct}%)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={(e) => openDeleteModal(e, plan)}
                          disabled={deletingId === plan.id}
                          className="rounded-lg p-2 text-white/20 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className="text-white/30 group-hover:text-white" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="mt-6 max-w-md rounded-2xl border border-white/[.08] bg-[#0E1214] p-6">
            <h3 className="text-sm font-semibold text-white">Ganti Password Akun</h3>
            <p className="mt-1 text-xs text-white/40">Khusus akun lokal dev. Minimal 6 karakter.</p>

            <div className="relative mt-4">
              <input
                type={showPass ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Password baru…"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 pr-10 text-xs text-white placeholder:text-white/30 focus:border-[#74FA6A]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {msg && (
              <p className={`mt-2 text-xs ${msgType === "success" ? "text-[#74FA6A]" : "text-red-400"}`}>
                {msg}
              </p>
            )}

            <button
              onClick={handleChangePass}
              className="mt-4 rounded-full bg-[#74FA6A] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
            >
              Update Password
            </button>
          </section>
        )}

        {/* Delete Modal */}
        {planToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121517] p-6">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold text-white">Hapus Riwayat Project?</h3>
              </div>
              <p className="mt-2 text-xs text-white/60 leading-relaxed">
                Project &quot;<strong>{planToDelete.title}</strong>&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setPlanToDelete(null)}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/60 hover:text-white"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeletePlan}
                  disabled={deletingId !== null}
                  className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deletingId ? "Menghapus…" : "Hapus Permanen"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {deleteToast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-white/10 bg-[#121517] px-4 py-2.5 text-xs text-white shadow-xl">
            {deleteToast}
          </div>
        )}
      </div>
    </Shell>
  );
}
