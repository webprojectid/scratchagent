"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Shell } from "@/components/brand";
import {
  KeyRound,
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
  Activity,
  Sparkles,
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
  Layers,
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

function GlassCard({
  children,
  className = "",
  delay = 0,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  const reduce = useReducedMotion();
  const enter = reduce ? {} : { opacity: 0, y: 12 };
  const visible = reduce ? {} : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={enter}
      animate={visible}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : delay }}
      className={`rounded-[18px] border border-white/[.08] bg-white/[.03] backdrop-blur-xl shadow-[0_8px_32px_#000A,inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 ${
        hover
          ? "hover:border-[#74FA6A]/20 hover:bg-white/[.05] hover:shadow-[0_8px_32px_#000A,inset_0_1px_0_rgba(116,250,106,0.1)]"
          : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children, icon }: { children: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 items-center justify-center rounded-lg bg-[#74FA6A]/10 text-[#74FA6A]">
        {icon}
      </div>
      <p className="font-mono text-[10.5px] font-bold uppercase tracking-[.18em] text-white/40">{children}</p>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [user, setUser] = useState<UserData | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
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

    // Fetch quota
    fetch("/api/generate")
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => {
        if (active && q) setQuota(q);
      })
      .catch(() => {});

    // Fetch CLI tokens
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

  // Filter & Search plans
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

  const ease = [0.16, 1, 0.3, 1] as const;
  const enter = reduce ? {} : { opacity: 0, y: 8 };
  const visible = reduce ? {} : { opacity: 1, y: 0 };

  const isPro = user.tier === "pro";
  const isAdmin = user.role === "admin" || user.email === "teguhends@gmail.com" || user.email?.startsWith("admin");
  const totalTasks = plans.reduce((a, p) => a + p.taskCount, 0);
  const doneTasks = plans.reduce((a, p) => a + p.tasksDone, 0);
  const donePlansCount = plans.filter((p) => p.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Shell back="/" sidebar={false}>
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 pt-12 md:pt-16">
        {/* Profile Header */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.3, ease }}
          className="flex flex-wrap items-center justify-between gap-6 rounded-[22px] border border-white/[.08] bg-[#0E1210]/90 p-6 md:p-8 backdrop-blur-2xl"
        >
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="grid size-[64px] shrink-0 place-items-center rounded-[20px] border border-[#74FA6A]/30 bg-[#74FA6A]/[.08] font-bold tracking-tight text-[#74FA6A] shadow-[0_0_30px_rgba(116,250,106,0.15)]" style={{ fontSize: "18px" }}>
                {initials || "?"}
              </div>
              <div className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-[#0E1210] bg-[#74FA6A]" />
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
                      placeholder="Nama Lengkap..."
                      className="rounded-lg border border-[#74FA6A]/50 bg-black/60 px-2.5 py-1 text-[14px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#74FA6A]"
                    />
                    <button
                      onClick={handleSaveName}
                      className="rounded-lg bg-[#74FA6A] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#A8FF9B]"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/50 hover:text-white"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="truncate font-bold leading-tight tracking-[-.02em] text-white" style={{ fontSize: "18px", lineHeight: "1.3" }}>
                      {user.name}
                    </div>
                    <button
                      onClick={() => {
                        setNameInput(user.name);
                        setEditingName(true);
                      }}
                      title="Ubah nama tampilan"
                      className="rounded p-1 text-white/30 transition hover:bg-white/10 hover:text-[#74FA6A]"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#74FA6A]/40 bg-[#74FA6A]/[.12] px-2 py-0.2 font-mono text-[9.5px] font-bold uppercase tracking-[.12em] text-[#74FA6A]">
                    <ShieldCheck size={10} /> admin
                  </span>
                )}
                {isPro ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#74FA6A] to-[#A8FF9B] px-2.5 py-0.2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-black shadow-[0_0_15px_rgba(116,250,106,0.3)]">
                    <Crown size={11} /> PRO MEMBER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[.06] px-2 py-0.2 font-mono text-[9.5px] font-bold uppercase tracking-[.12em] text-white/50">
                    FREE TIER
                  </span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] text-white/50">
                <span className="truncate">{user.email}</span>
                {user.createdAt && (
                  <span className="flex items-center gap-1 text-[11.5px] text-white/35">
                    <Calendar size={11} /> Member sejak{" "}
                    {new Date(user.createdAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]"
            >
              <Plus size={14} /> Buat Plan Baru
            </Link>
            {!isPro && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#74FA6A]/40 bg-[#74FA6A]/[.06] px-3.5 py-2 text-[12px] font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/[.15]"
              >
                <Sparkles size={12} /> Upgrade Pro
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#74FA6A]/35 bg-[#74FA6A]/[.08] px-3.5 py-2 text-[12px] font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/[.18]"
              >
                <ShieldCheck size={13} /> Developer Setting
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/[.06] px-3.5 py-2 text-[12px] font-semibold text-red-400 transition hover:bg-red-500/[.15] active:scale-[.985]"
            >
              <LogOut size={13} /> Keluar
            </button>
          </div>
        </motion.section>

        {/* Tier & Quota Hub */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {/* Card 1: Subscription Status */}
          <GlassCard className="relative overflow-hidden p-5" delay={0.05} hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/40">
                Paket Langganan
              </p>
              {isPro ? (
                <Crown size={15} className="text-[#74FA6A]" />
              ) : (
                <Zap size={15} className="text-white/40" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-bold text-white" style={{ fontSize: "18px" }}>{isPro ? "Scratch Pro" : "Scratch Free"}</p>
            </div>
            <p className="mt-1 text-[12px] text-white/45">
              {isPro
                ? user.proExpiresAt
                  ? `Aktif s.d. ${new Date(user.proExpiresAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : "Masa aktif tanpa batas"
                : "Akses dasar 3 generate / 24 jam"}
            </p>
            {!isPro && (
              <Link
                href="/pricing"
                className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#74FA6A] hover:underline"
              >
                Lihat benefit paket Pro <ArrowUpRight size={12} />
              </Link>
            )}
          </GlassCard>

          {/* Card 2: Quota & Generates */}
          <GlassCard className="p-5" delay={0.1} hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/40">
                Kuota Generate Plan
              </p>
              <Clock size={15} className="text-[#74FA6A]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-bold text-[#74FA6A]" style={{ fontSize: "18px" }}>
                {isPro ? "Unlimited" : `${quota?.remaining ?? 3} / 3`}
              </p>
              {!isPro && <span className="text-[11.5px] text-white/40">tersisa hari ini</span>}
            </div>
            <p className="mt-1 text-[12px] text-white/45">
              {isPro
                ? "Bebas generate plan tanpa batas kuota"
                : "Reset otomatis rolling 24 jam per generate"}
            </p>
          </GlassCard>

          {/* Card 3: Completion Rate */}
          <GlassCard className="p-5" delay={0.15} hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/40">
                Task Completion Rate
              </p>
              <CheckCircle2 size={15} className="text-[#74FA6A]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-bold text-white" style={{ fontSize: "18px" }}>{completionRate}%</p>
              <span className="text-[11.5px] text-white/40">({doneTasks}/{totalTasks} task)</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#74FA6A] transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </GlassCard>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard className="p-4" delay={0.18} hover>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35">Total Projects</p>
            <p className="mt-1 font-bold text-white" style={{ fontSize: "18px" }}>{plans.length}</p>
          </GlassCard>
          <GlassCard className="p-4" delay={0.2} hover>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35">Project Selesai</p>
            <p className="mt-1 font-bold text-[#74FA6A]" style={{ fontSize: "18px" }}>{donePlansCount}</p>
          </GlassCard>
          <GlassCard className="p-4" delay={0.22} hover>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35">Total Tasks</p>
            <p className="mt-1 font-bold text-white" style={{ fontSize: "18px" }}>{totalTasks}</p>
          </GlassCard>
          <GlassCard className="p-4" delay={0.24} hover>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35">Tasks Selesai</p>
            <p className="mt-1 font-bold text-[#74FA6A]" style={{ fontSize: "18px" }}>{doneTasks}</p>
          </GlassCard>
        </div>

        {/* CLI Token Quick Access */}
        <GlassCard className="mt-6 p-6" delay={0.26} hover>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionLabel icon={<Terminal size={14} />}>cli token &amp; integrasi</SectionLabel>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-[#74FA6A] hover:underline"
            >
              Kelola di Settings <ChevronRight size={13} />
            </Link>
          </div>
          <p className="mt-2 text-[12.5px] text-white/50">
            Gunakan token ini untuk login ke agent CLI (<code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[#74FA6A]">scratch-agent login --token &lt;token&gt;</code>)
          </p>

          {tokens.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {tokens.slice(0, 2).map((t) => (
                <div
                  key={t.hash}
                  className="flex items-center gap-3 rounded-[12px] border border-white/[.08] bg-white/[.03] px-3.5 py-2"
                >
                  <span className="font-mono text-[11px] text-white/70">{t.label}</span>
                  <span className="font-mono text-[11px] text-white/30">({t.hash.slice(0, 10)}…)</span>
                  <button
                    onClick={() => handleCopy(`scratch-agent login --token ${t.hash}`, t.hash)}
                    className="inline-flex items-center gap-1 rounded-md bg-[#74FA6A]/[.12] px-2 py-1 font-mono text-[10.5px] font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/[.2]"
                  >
                    {copiedToken === t.hash ? <Check size={12} /> : <Copy size={12} />}
                    {copiedToken === t.hash ? "Tersalin!" : "Salin Login Command"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <p className="text-[12px] text-white/35">Belum ada CLI token.</p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 rounded-full bg-white/[.06] px-3 py-1 font-mono text-[11px] text-white transition hover:bg-white/10"
              >
                <Plus size={12} /> Buat Token
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Main Tabs Navigation */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/[.08] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("projects")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11.5px] font-semibold transition ${
                activeTab === "projects"
                  ? "bg-[#74FA6A] text-black"
                  : "bg-white/[.04] text-white/50 hover:text-white"
              }`}
            >
              <FolderOpen size={13} /> Riwayat Project ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11.5px] font-semibold transition ${
                activeTab === "security"
                  ? "bg-[#74FA6A] text-black"
                  : "bg-white/[.04] text-white/50 hover:text-white"
              }`}
            >
              <Shield size={13} /> Ganti Password &amp; Sesi
            </button>
          </div>
        </div>

        {activeTab === "projects" ? (
          /* Project History with Search & Filters */
          <GlassCard className="mt-5 p-6" delay={0.1} hover>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SectionLabel icon={<FolderOpen size={14} />}>project history</SectionLabel>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Cari project…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-full border border-white/[.08] bg-white/[.04] py-1.5 pl-8 pr-3 font-mono text-[11.5px] text-white placeholder:text-white/25 focus:border-[#74FA6A]/40 focus:outline-none"
                  />
                </div>
                <div className="flex items-center rounded-full border border-white/[.08] bg-white/[.03] p-0.5 text-[11px]">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`rounded-full px-2.5 py-1 font-mono transition ${
                      statusFilter === "all" ? "bg-[#74FA6A] font-semibold text-black" : "text-white/45 hover:text-white"
                    }`}
                  >
                    Semua ({plans.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("done")}
                    className={`rounded-full px-2.5 py-1 font-mono transition ${
                      statusFilter === "done" ? "bg-[#74FA6A] font-semibold text-black" : "text-white/45 hover:text-white"
                    }`}
                  >
                    Selesai
                  </button>
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`rounded-full px-2.5 py-1 font-mono transition ${
                      statusFilter === "active" ? "bg-[#74FA6A] font-semibold text-black" : "text-white/45 hover:text-white"
                    }`}
                  >
                    Dikerjakan
                  </button>
                </div>
              </div>
            </div>

            {plansLoading ? (
              <div className="mt-8 flex items-center justify-center gap-2 py-10">
                <Loader2 size={16} className="animate-spin text-white/25" />
                <p className="text-[12px] text-white/30">Memuat project…</p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-center">
                <FolderOpen size={36} className="text-white/15" />
                <p className="text-[13px] text-white/40">
                  {searchQuery ? "Tidak ada project yang cocok dengan pencarian." : "Belum ada project di akun ini."}
                </p>
                <Link
                  href="/new"
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#74FA6A] px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-[#A8FF9B]"
                >
                  <Plus size={13} /> Buat Plan Sekarang
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                {filteredPlans.map((plan) => {
                  const pct = plan.taskCount > 0 ? Math.round((plan.tasksDone / plan.taskCount) * 100) : 0;
                  const statusColor =
                    plan.status === "done"
                      ? "text-[#74FA6A] bg-[#74FA6A]/[.1]"
                      : plan.status === "failed"
                      ? "text-red-400 bg-red-500/[.1]"
                      : plan.status === "generating"
                      ? "text-amber-300 bg-amber-500/[.1]"
                      : "text-white/60 bg-white/[.06]";
                  const statusLabel =
                    plan.status === "done"
                      ? "Selesai"
                      : plan.status === "failed"
                      ? "Gagal"
                      : plan.status === "generating"
                      ? "Generating…"
                      : "Dikerjakan";

                  return (
                    <Link
                      key={plan.id}
                      href={`/project/${plan.id}`}
                      className="group flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-white/[.06] bg-white/[.02] p-4 transition hover:border-[#74FA6A]/20 hover:bg-white/[.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="truncate text-[14px] font-semibold text-white/90 group-hover:text-[#74FA6A]">
                            {plan.title}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.08em] ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-white/35">
                          {plan.createdAt && (
                            <span>
                              {new Date(plan.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                          {plan.stack.length > 0 && (
                            <span className="truncate text-white/45">
                              • {plan.stack.slice(0, 3).join(", ")}
                            </span>
                          )}
                          <span>• {plan.featureCount} Fase</span>
                        </div>

                        {plan.taskCount > 0 && (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-white/[.06]">
                              <div
                                className="h-full rounded-full bg-[#74FA6A]/75 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10.5px] text-white/30">
                              {plan.tasksDone}/{plan.taskCount} task ({pct}%)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => openDeleteModal(e, plan)}
                          disabled={deletingId === plan.id}
                          className="rounded-lg p-2 text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
                          title="Hapus Project History"
                        >
                          {deletingId === plan.id ? (
                            <Loader2 size={15} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                        <div className="grid size-8 place-items-center rounded-full bg-white/[.04] text-white/30 transition group-hover:bg-[#74FA6A] group-hover:text-black">
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </GlassCard>
        ) : (
          /* Main Grid: Security & Session Management */
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* Security */}
            <GlassCard className="p-6" delay={0.1} hover>
              <SectionLabel icon={<Shield size={14} />}>keamanan akun</SectionLabel>
              <p className="mt-2.5 text-[12.5px] leading-5 text-white/45">
                Ganti password akun kamu. Minimal 6 karakter.
              </p>

              <div className="mt-4">
                <label
                  htmlFor="new-pass"
                  className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35"
                >
                  password baru
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input
                    id="new-pass"
                    type={showPass ? "text" : "password"}
                    placeholder="Tulis password baru"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full rounded-[10px] border border-white/[.08] bg-white/[.04] py-2.5 pl-10 pr-11 text-[13px] text-white placeholder:text-white/20 focus:border-[#74FA6A]/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white"
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {msg && (
                  <p className={`mt-2 text-[12px] ${msgType === "error" ? "text-red-400" : "text-[#74FA6A]"}`}>
                    {msg}
                  </p>
                )}

                <button
                  onClick={handleChangePass}
                  className="mt-4 w-full rounded-full bg-[#74FA6A] py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]"
                >
                  Simpan Password Baru
                </button>
              </div>
            </GlassCard>

            {/* Session */}
            <GlassCard className="p-6" delay={0.15} hover>
              <SectionLabel icon={<Activity size={14} />}>manajemen sesi</SectionLabel>
              <p className="mt-2.5 text-[12.5px] leading-5 text-white/45">
                Keluar dari akun di perangkat ini. Semua project kamu tersimpan aman.
              </p>

              <div className="mt-4 rounded-[12px] border border-white/[.06] bg-white/[.02] p-4 text-[12px] text-white/50">
                <p className="flex items-center justify-between">
                  <span>Status Login:</span>
                  <span className="font-mono font-semibold text-[#74FA6A]">Aktif</span>
                </p>
                <p className="mt-2 flex items-center justify-between">
                  <span>Email Terkait:</span>
                  <span className="font-mono text-white/80">{user.email}</span>
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-500/25 py-2.5 text-[12.5px] font-semibold text-red-400 transition hover:border-red-500/50 hover:bg-red-500/[.08] active:scale-[.985]"
              >
                <LogOut size={14} /> Keluar dari Akun
              </button>
            </GlassCard>
          </div>
        )}

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {deleteToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-[#74FA6A]/30 bg-[#0E1210]/95 px-4 py-3 text-[13px] text-white shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(116,250,106,0.15)] backdrop-blur-xl"
            >
              <div className="grid size-6 place-items-center rounded-full bg-[#74FA6A]/20 text-[#74FA6A]">
                <Check size={13} />
              </div>
              <span className="font-medium">{deleteToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Delete Confirmation Modal */}
        <AnimatePresence>
          {planToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  if (!deletingId) setPlanToDelete(null);
                }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 16 }}
                transition={{ type: "spring", damping: 25, stiffness: 320 }}
                className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-red-500/25 bg-[#0E1210] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(239,68,68,0.15)] backdrop-blur-2xl"
              >
                {/* Background Ambient Glow */}
                <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />

                {/* Close Button */}
                <button
                  disabled={deletingId !== null}
                  onClick={() => setPlanToDelete(null)}
                  className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <X size={16} />
                </button>

                <div className="relative">
                  {/* Warning Icon Badge */}
                  <div className="flex items-center gap-3.5">
                    <div className="grid size-12 place-items-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white" style={{ fontSize: "17px" }}>
                        Hapus Project History?
                      </h3>
                      <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[.14em] text-red-400/80">
                        tindakan permanen
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-[12.5px] leading-relaxed text-white/55">
                    Seluruh file PRD, struktur fitur, roadmap, dan daftar task pada project ini akan dihapus secara permanen dari akun kamu dan tidak dapat dipulihkan kembali.
                  </p>

                  {/* Project Summary Box */}
                  <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] p-3.5">
                    <p className="truncate text-[13.5px] font-semibold text-white">
                      {planToDelete.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-white/40">
                      <span className="rounded bg-white/[.06] px-1.5 py-0.5 text-[#74FA6A]">
                        {planToDelete.featureCount} Fase
                      </span>
                      <span className="rounded bg-white/[.06] px-1.5 py-0.5 text-white/60">
                        {planToDelete.taskCount} Tasks ({planToDelete.tasksDone} selesai)
                      </span>
                      {planToDelete.createdAt && (
                        <span>
                          Dibuat {new Date(planToDelete.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() => setPlanToDelete(null)}
                      className="rounded-full border border-white/10 px-4 py-2 text-[12px] font-semibold text-white/60 transition hover:border-white/25 hover:bg-white/[.04] hover:text-white disabled:opacity-40"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={confirmDeletePlan}
                      className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2 text-[12px] font-semibold text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] transition hover:bg-red-600 active:scale-[.985] disabled:opacity-60"
                    >
                      {deletingId ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Menghapus…</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          <span>Ya, Hapus Project</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
