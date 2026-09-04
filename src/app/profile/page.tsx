"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
import {
  LogOut,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
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
  Terminal,
  Calendar,
  Pencil,
  AlertTriangle,
  Settings,
  ArrowUpRight,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { getCurrentUser, refreshCurrentUser, supabaseConfigured } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/client";

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

  const [user, setUser] = useState<UserData | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all");

  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanSummary | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "security">("overview");
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
      setMsg("Password berhasil diperbarui.");
      setMsgType("success");
      setNewPass("");
      setTimeout(() => setMsg(""), 3000);
    } else {
      setMsg("Akun tidak terdaftar pada sesi lokal.");
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
        setTimeout(() => setDeleteToast(null), 3000);
        setPlanToDelete(null);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Gagal menghapus plan");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === "done") return p.status === "done";
      if (statusFilter === "active") return p.status !== "done";
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
      <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-6 sm:px-6 md:pt-10">
        {/* Subtle Top Island Navigation */}
        <div className="flex items-center justify-between border-b border-white/[.06] pb-3 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === "overview"
                  ? "bg-white/[.06] text-white"
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === "security"
                  ? "bg-white/[.06] text-white"
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              Keamanan
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin/users"
                className="flex items-center gap-1 rounded-md border border-[#74FA6A]/20 bg-[#74FA6A]/[0.05] px-2.5 py-1 text-[11px] font-medium text-[#74FA6A] transition hover:bg-[#74FA6A]/10"
              >
                <ShieldCheck size={12} /> Developer Hub
              </Link>
            )}
            <Link
              href="/settings"
              className="flex items-center gap-1 rounded-md border border-white/[.08] bg-white/[.02] px-2.5 py-1 text-[11px] font-medium text-white/70 transition hover:bg-white/[.05] hover:text-white"
            >
              <Settings size={12} /> Setting
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/[0.04] px-2.5 py-1 text-[11px] font-medium text-red-400/80 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={12} /> Keluar
            </button>
          </div>
        </div>

        {activeTab === "overview" ? (
          <>
            {/* Double-Bezel Header Card */}
            <div className="mt-5 rounded-2xl border border-white/[.06] bg-white/[.02] p-1.5">
              <div className="rounded-xl border border-white/[.04] bg-[#0E1113] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.03] font-mono text-sm font-semibold text-[#74FA6A]">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {editingName ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveName();
                                if (e.key === "Escape") setEditingName(false);
                              }}
                              autoFocus
                              className="rounded border border-[#74FA6A]/40 bg-black/50 px-2 py-0.5 text-xs font-semibold text-white focus:outline-none"
                            />
                            <button
                              onClick={handleSaveName}
                              className="rounded bg-[#74FA6A] px-2 py-0.5 text-[10.5px] font-bold text-black"
                            >
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <>
                            <h1 className="text-sm font-semibold text-white">{user.name}</h1>
                            <button
                              onClick={() => {
                                setNameInput(user.name);
                                setEditingName(true);
                              }}
                              className="text-white/30 hover:text-white"
                              title="Edit nama"
                            >
                              <Pencil size={11} />
                            </button>
                          </>
                        )}
                        <span className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase tracking-wider ${
                          isPro ? "bg-[#74FA6A]/10 text-[#74FA6A] border border-[#74FA6A]/20" : "bg-white/[.06] text-white/50 border border-white/[.06]"
                        }`}>
                          {isPro ? "Pro Plan" : "Free Plan"}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-white/40">
                        <span>{user.email}</span>
                        {user.createdAt && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(user.createdAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isPro && (
                      <Link
                        href="/pricing"
                        className="flex items-center gap-1.5 rounded-lg border border-[#74FA6A]/30 bg-[#74FA6A]/[0.05] px-3 py-1.5 text-xs font-medium text-[#74FA6A] transition hover:bg-[#74FA6A]/15"
                      >
                        <Sparkles size={12} /> Upgrade
                      </Link>
                    )}
                    <Link
                      href="/new"
                      className="group flex items-center gap-1.5 rounded-lg bg-[#74FA6A] px-3.5 py-1.5 text-xs font-medium text-black transition hover:bg-[#A8FF9B]"
                    >
                      <span>Buat Plan</span>
                      <div className="flex size-4 items-center justify-center rounded-full bg-black/10 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <ArrowUpRight size={10} />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Double-Bezel Metrics Row (Clean, Compact Developer Sizing) */}
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Stat 1 */}
              <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-1">
                <div className="rounded-lg border border-white/[.04] bg-[#0E1113] p-3">
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-white/40">
                    <span>KUOTA GENERATE</span>
                    <Zap size={11} className="text-[#74FA6A]" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tracking-tight text-white">
                      {isPro ? "Unlimited" : `${quota?.remaining ?? 3} / 3`}
                    </span>
                    {!isPro && <span className="text-[10.5px] text-white/40">tersisa</span>}
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-white/40">
                    {isPro ? "Bebas buat plan tanpa limit" : "Reset rolling 24 jam"}
                  </p>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-1">
                <div className="rounded-lg border border-white/[.04] bg-[#0E1113] p-3">
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-white/40">
                    <span>PROJECT TERSIMPAN</span>
                    <FolderOpen size={11} className="text-white/40" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tracking-tight text-white">{plans.length}</span>
                    <span className="text-[10.5px] text-[#74FA6A]">({donePlansCount} selesai)</span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Total arsip PRD aktif</p>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-1">
                <div className="rounded-lg border border-white/[.04] bg-[#0E1113] p-3">
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-white/40">
                    <span>PROGRESS TASK</span>
                    <Activity size={11} className="text-white/40" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tracking-tight text-white">{completionRate}%</span>
                    <span className="text-[10.5px] text-white/40">({doneTasks}/{totalTasks} tuntas)</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-white/[.06]">
                    <div
                      className="h-full rounded-full bg-[#74FA6A]"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CLI Command Helper Card */}
            <div className="mt-3.5 rounded-2xl border border-white/[.06] bg-white/[.02] p-1.5">
              <div className="rounded-xl border border-white/[.04] bg-[#0E1113] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Terminal size={13} className="text-[#74FA6A]" />
                    <span className="font-medium text-white/90">CLI Agent Quick Login</span>
                  </div>
                  <Link href="/settings" className="font-mono text-[11px] text-[#74FA6A] hover:underline">
                    Kelola Token →
                  </Link>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  {tokens.length > 0 ? (
                    tokens.slice(0, 2).map((t) => {
                      const cmd = `scratch-agent login --token ${t.hash} --url ${origin || "https://www.scratchagent.web.id"}`;
                      return (
                        <button
                          key={t.hash}
                          onClick={() => handleCopy(cmd, t.hash)}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/[.06] bg-black/40 px-3 py-1.5 font-mono text-xs text-white/80 transition hover:border-[#74FA6A]/30"
                        >
                          <span className="truncate max-w-[280px]">{t.label}: {t.hash.slice(0, 10)}…</span>
                          {copiedToken === t.hash ? (
                            <Check size={11} className="text-[#74FA6A]" />
                          ) : (
                            <Copy size={11} className="text-white/40" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-white/40">Belum ada CLI token. Generate di Setting.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Project List Section */}
            <div className="mt-5 rounded-2xl border border-white/[.06] bg-white/[.02] p-1.5">
              <div className="rounded-xl border border-white/[.04] bg-[#0E1113] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-3">
                  <div>
                    <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Daftar Project</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        placeholder="Cari project…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-44 rounded-lg border border-white/[.08] bg-black/40 py-1 pl-7 pr-2.5 text-xs text-white placeholder:text-white/30 focus:border-[#74FA6A]/40 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center rounded-lg border border-white/[.08] bg-black/40 p-0.5 text-xs font-mono">
                      <button
                        onClick={() => setStatusFilter("all")}
                        className={`rounded px-2 py-0.5 text-[11px] ${statusFilter === "all" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setStatusFilter("active")}
                        className={`rounded px-2 py-0.5 text-[11px] ${statusFilter === "active" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                      >
                        Berjalan
                      </button>
                      <button
                        onClick={() => setStatusFilter("done")}
                        className={`rounded px-2 py-0.5 text-[11px] ${statusFilter === "done" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                </div>

                {plansLoading ? (
                  <div className="flex items-center justify-center py-12 text-white/30">
                    <Loader2 size={14} className="animate-spin mr-2" />
                    <span className="text-xs font-mono">Memuat project…</span>
                  </div>
                ) : filteredPlans.length === 0 ? (
                  <div className="py-10 text-center">
                    <FolderOpen size={24} className="mx-auto text-white/20" />
                    <p className="mt-2 text-xs text-white/40">Belum ada project yang cocok.</p>
                  </div>
                ) : (
                  <div className="mt-2 divide-y divide-white/[.03]">
                    {filteredPlans.map((plan) => {
                      const pct = plan.taskCount > 0 ? Math.round((plan.tasksDone / plan.taskCount) * 100) : 0;
                      return (
                        <div
                          key={plan.id}
                          className="flex flex-col justify-between gap-2.5 py-3 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/project/${plan.id}`}
                                className="truncate text-xs font-medium text-white/90 hover:text-[#74FA6A]"
                              >
                                {plan.title}
                              </Link>
                              <span className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                                plan.status === "done"
                                  ? "bg-[#74FA6A]/10 text-[#74FA6A]"
                                  : plan.status === "generating"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-white/10 text-white/50"
                              }`}>
                                {plan.status}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-2.5 font-mono text-[10.5px] text-white/35">
                              {plan.createdAt && (
                                <span>{new Date(plan.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                              )}
                              <span>•</span>
                              <span>{plan.featureCount} Fase</span>
                              <span>•</span>
                              <span>{plan.tasksDone}/{plan.taskCount} Task ({pct}%)</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/project/${plan.id}`}
                              className="rounded-md border border-white/[.08] bg-white/[.02] px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/[.06] hover:text-white"
                            >
                              Buka
                            </Link>
                            <button
                              onClick={(e) => openDeleteModal(e, plan)}
                              disabled={deletingId === plan.id}
                              className="rounded-md p-1 text-white/20 hover:text-red-400"
                              title="Hapus project"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Security Tab */
          <div className="mt-5 rounded-2xl border border-white/[.06] bg-white/[.02] p-1.5 max-w-md">
            <div className="rounded-xl border border-white/[.04] bg-[#0E1113] p-5">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Ganti Password</h2>
              <p className="mt-1 text-xs text-white/40">Khusus kredensial dev lokal. Minimal 6 karakter.</p>

              <div className="relative mt-3.5">
                <input
                  type={showPass ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Password baru…"
                  className="w-full rounded-lg border border-white/[.08] bg-black/40 px-3 py-1.5 pr-9 text-xs text-white placeholder:text-white/30 focus:border-[#74FA6A]/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>

              {msg && (
                <p className={`mt-2 text-xs ${msgType === "success" ? "text-[#74FA6A]" : "text-red-400"}`}>
                  {msg}
                </p>
              )}

              <button
                onClick={handleChangePass}
                className="mt-3.5 rounded-lg bg-[#74FA6A] px-3.5 py-1.5 text-xs font-medium text-black transition hover:bg-[#A8FF9B]"
              >
                Simpan Password
              </button>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus */}
        {planToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#14171A] p-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={15} />
                <h3 className="text-xs font-semibold text-white">Hapus Project?</h3>
              </div>
              <p className="mt-1.5 text-xs text-white/60">
                Project &quot;{planToDelete.title}&quot; akan dihapus permanen.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setPlanToDelete(null)}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 hover:text-white"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeletePlan}
                  disabled={deletingId !== null}
                  className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deletingId ? "Menghapus…" : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {deleteToast && (
          <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-white/10 bg-[#14171A] px-3 py-1.5 text-xs text-white shadow-lg">
            {deleteToast}
          </div>
        )}
      </div>
    </Shell>
  );
}
