"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  KeyRound,
  FolderOpen,
  Terminal,
  Cpu,
  LogOut,
  Plus,
  Crown,
  Zap,
  Search,
  Copy,
  Check,
  Trash2,
  Calendar,
  Pencil,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Play,
  ArrowUp,
  ArrowDown,
  ExternalLink,
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
  unlimited?: boolean;
  resetAt?: string;
};

type TokenItem = {
  hash: string;
  label: string;
  revoked: boolean;
  createdAt?: string;
};

type ProviderForm = {
  baseUrl: string;
  apiKey: string;
  models: string;
  apiKeySet?: boolean;
  apiKeyMasked?: string;
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

type NavTab = "profile" | "plans" | "tokens" | "security" | "llm";

export default function ProfilePage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<NavTab>("profile");
  const [user, setUser] = useState<UserData | null>(null);
  const [origin, setOrigin] = useState("");

  // Plans state
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Quota & Tokens state
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [creatingToken, setCreatingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Security / Pass state
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passMsgType, setPassMsgType] = useState<"error" | "success">("error");

  // Profile Name Edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // LLM state (Admin only)
  const [llmCfg, setLlmCfg] = useState<LlmCfgInfo | null>(null);
  const [providers, setProviders] = useState<ProviderForm[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<number, boolean>>({});
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [llmSaving, setLlmSaving] = useState(false);

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
        if (active && Array.isArray(tList)) setTokens(tList);
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

      const isAdminUser = u.role === "admin" || u.email === "teguhends@gmail.com" || u.email?.startsWith("admin");
      if (isAdminUser) {
        const qs = u.email ? `?userId=${encodeURIComponent(u.email)}` : "";
        fetch(`/api/llm-config${qs}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: LlmCfgInfo | null) => {
            if (!active || !d) return;
            setLlmCfg(d);
            const fromApi = (d.providers ?? []).map((p) => ({
              baseUrl: p.baseUrl,
              apiKey: "",
              models: p.models.join(", "),
              apiKeySet: p.apiKeySet,
              apiKeyMasked: p.apiKeyMasked,
            }));
            setProviders(
              fromApi.length > 0
                ? fromApi
                : [
                    {
                      baseUrl: d.baseUrl ?? "",
                      apiKey: "",
                      models: d.model ?? "",
                      apiKeySet: d.apiKeySet,
                      apiKeyMasked: d.apiKeyMasked,
                    },
                  ],
            );
          })
          .catch(() => {});
      }
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

  const handleChangePass = () => {
    if (!user) return;
    if (newPass.length < 6) {
      setPassMsg("Password minimal 6 karakter.");
      setPassMsgType("error");
      return;
    }
    const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
    const userKey = user.email.toLowerCase();
    if (storedUsers[userKey]) {
      storedUsers[userKey].password = newPass;
      localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
      setPassMsg("Password berhasil diperbarui.");
      setPassMsgType("success");
      setNewPass("");
      setTimeout(() => setPassMsg(""), 3000);
    } else {
      setPassMsg("Akun tidak terdaftar pada sesi lokal.");
      setPassMsgType("error");
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const createToken = async () => {
    setCreatingToken(true);
    try {
      const u = await getCurrentUser();
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `CLI-${new Date().toLocaleDateString("id-ID")}`, userId: u?.email }),
      });
      const data = await res.json();
      if (data.token) {
        setNewToken(data.token);
        const tList = await fetch("/api/tokens").then((r) => r.json());
        if (Array.isArray(tList)) setTokens(tList);
      }
    } finally {
      setCreatingToken(false);
    }
  };

  const revokeToken = async (hash: string) => {
    const u = await getCurrentUser();
    await fetch("/api/tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash, userId: u?.email }),
    });
    setTokens((prev) => prev.map((t) => (t.hash === hash ? { ...t, revoked: true } : t)));
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
        setToast(`Project "${title}" berhasil dihapus.`);
        setTimeout(() => setToast(null), 3000);
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

  const updateProvider = (index: number, patch: Partial<ProviderForm>) => {
    setProviders((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addProvider = () => {
    if (providers.length >= 8) return;
    setProviders((list) => [...list, { baseUrl: "", apiKey: "", models: "" }]);
  };

  const removeProvider = (index: number) => {
    if (providers.length <= 1) return;
    setProviders((list) => list.filter((_, i) => i !== index));
  };

  const moveProvider = (index: number, dir: -1 | 1) => {
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
      const u = await getCurrentUser();
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      const res = await fetch(`/api/llm-config/test${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: p.baseUrl, apiKey: p.apiKey, models: p.models }),
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
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [index]: { testing: false, ok: false, error: e?.message || "Koneksi gagal" },
      }));
    }
  };

  const saveLlm = async () => {
    setLlmSaving(true);
    try {
      const u = await getCurrentUser();
      const qs = u?.email ? `?userId=${encodeURIComponent(u.email)}` : "";
      const payload = {
        providers: providers.map((p) => ({
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
        setToast("Konfigurasi LLM berhasil disimpan.");
        setTimeout(() => setToast(null), 3000);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Gagal menyimpan konfigurasi LLM");
      }
    } finally {
      setLlmSaving(false);
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
    <div className="flex min-h-screen bg-[#07090A] text-white">
      {/* SIDEBAR NAVIGASI KIRI (Sesuai Referensi) */}
      <aside className="w-64 shrink-0 border-r border-white/[.08] bg-[#050607] flex flex-col justify-between py-6 px-4">
        <div>
          {/* Brand / Logo Title */}
          <div className="px-2 mb-6 flex items-center justify-between">
            <Link href="/" className="text-xs font-semibold tracking-wider text-white hover:text-[#74FA6A] flex items-center gap-2">
              <ArrowLeft size={14} className="text-white/40" />
              <span>Kembali</span>
            </Link>
          </div>

          {/* Seksi 1: CUSTOMIZE */}
          <div className="mb-6">
            <div className="flex items-center gap-2 px-2 pb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/30">CUSTOMIZE</span>
              <div className="h-px flex-1 bg-white/[.06]" />
            </div>

            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                  activeTab === "profile"
                    ? "bg-[#181B1D] text-[#74FA6A] font-semibold"
                    : "text-white/60 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                <User size={16} className={activeTab === "profile" ? "text-[#74FA6A]" : "text-white/40"} />
                <span>Profile</span>
              </button>

              <button
                onClick={() => setActiveTab("plans")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                  activeTab === "plans"
                    ? "bg-[#181B1D] text-[#74FA6A] font-semibold"
                    : "text-white/60 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen size={16} className={activeTab === "plans" ? "text-[#74FA6A]" : "text-white/40"} />
                  <span>Projects</span>
                </div>
                <span className="font-mono text-[10px] text-white/30">{plans.length}</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                  activeTab === "security"
                    ? "bg-[#181B1D] text-[#74FA6A] font-semibold"
                    : "text-white/60 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                <Shield size={16} className={activeTab === "security" ? "text-[#74FA6A]" : "text-white/40"} />
                <span>Security</span>
              </button>

              <Link
                href="/pricing"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-white/60 hover:bg-white/[.04] hover:text-white transition"
              >
                <div className="flex items-center gap-3">
                  <Crown size={16} className="text-white/40" />
                  <span>Billing</span>
                </div>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#74FA6A]/10 text-[#74FA6A]">
                  {isPro ? "Pro" : "Free"}
                </span>
              </Link>
            </div>
          </div>

          {/* Seksi 2: TOOLS */}
          <div className="mb-6">
            <div className="flex items-center gap-2 px-2 pb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/30">TOOLS</span>
              <div className="h-px flex-1 bg-white/[.06]" />
            </div>

            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab("tokens")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                  activeTab === "tokens"
                    ? "bg-[#181B1D] text-[#74FA6A] font-semibold"
                    : "text-white/60 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Terminal size={16} className={activeTab === "tokens" ? "text-[#74FA6A]" : "text-white/40"} />
                  <span>CLI Tokens</span>
                </div>
                <span className="font-mono text-[10px] text-white/30">
                  {tokens.filter((t) => !t.revoked).length}
                </span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab("llm")}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                      activeTab === "llm"
                        ? "bg-[#181B1D] text-[#74FA6A] font-semibold"
                        : "text-white/60 hover:bg-white/[.04] hover:text-white"
                    }`}
                  >
                    <Cpu size={16} className={activeTab === "llm" ? "text-[#74FA6A]" : "text-white/40"} />
                    <span>LLM Engine</span>
                  </button>

                  <Link
                    href="/admin/users"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-white/60 hover:bg-white/[.04] hover:text-white transition"
                  >
                    <Shield size={16} className="text-white/40" />
                    <span>Admin Setting</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Nav Kiri */}
        <div className="border-t border-white/[.06] pt-4 space-y-1">
          <Link
            href="/docs"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-white/60 hover:bg-white/[.04] hover:text-white transition"
          >
            <ExternalLink size={16} className="text-white/40" />
            <span>Dokumentasi</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* PANEL KONTEN KANAN (Flat Borderless List Sesuai Referensi) */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto max-w-4xl">
        
        {/* TAB 1: PROFILE */}
        {activeTab === "profile" && (
          <div>
            {/* Header Seksi */}
            <div className="pb-6 border-b border-white/[.08]">
              <h1 className="text-2xl font-bold tracking-tight text-white">Profile</h1>
              <p className="mt-1 text-xs text-white/50">
                Kelola identitas akun dan status kuota Anda.{" "}
                <Link href="/pricing" className="text-[#74FA6A] hover:underline">Pelajari benefit paket</Link>
              </p>
            </div>

            {/* List Row per Row (Sesuai Referensi) */}
            <div className="py-8 space-y-8">
              {/* Row 1: Nama Pengguna */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[.04] border border-white/10 text-white font-mono text-xs">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Nama Pengguna</h2>
                    <p className="text-xs text-white/50 mt-0.5">Nama tampilan profil publik akun Anda.</p>
                  </div>
                </div>
                <div>
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
                        className="rounded border border-[#74FA6A]/50 bg-black px-2.5 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={handleSaveName}
                        className="rounded bg-[#74FA6A] px-2.5 py-1 text-xs font-semibold text-black hover:bg-[#A8FF9B]"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setNameInput(user.name);
                        setEditingName(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white border border-white/10 rounded-md px-3 py-1.5 transition"
                    >
                      <span>{user.name}</span>
                      <Pencil size={11} className="text-white/40" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Email Terdaftar */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[.04] border border-white/10 text-white/60">
                    @
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Email Akun</h2>
                    <p className="text-xs text-white/50 mt-0.5">Alamat email terverifikasi untuk login.</p>
                  </div>
                </div>
                <div className="font-mono text-xs text-white/60 self-center">
                  {user.email}
                </div>
              </div>

              {/* Row 3: Status Paket */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[.04] border border-white/10 text-[#74FA6A]">
                    <Crown size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Status Langganan</h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      {isPro ? "Akses Scratch Pro aktif tanpa batas generate." : "Paket Free dasar (3 generate per rolling 24 jam)."}
                    </p>
                  </div>
                </div>
                <div className="self-center">
                  {!isPro ? (
                    <Link
                      href="/pricing"
                      className="rounded-md bg-[#74FA6A] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
                    >
                      Upgrade Pro
                    </Link>
                  ) : (
                    <span className="rounded bg-[#74FA6A]/10 text-[#74FA6A] px-2.5 py-1 text-xs font-mono font-medium">
                      PRO ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Row 4: Kuota Generate */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[.04] border border-white/10 text-white/60">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Sisa Kuota Generate</h2>
                    <p className="text-xs text-white/50 mt-0.5">Kapasitas pembuatan plan PRD harian.</p>
                  </div>
                </div>
                <div className="font-mono text-xs font-semibold text-[#74FA6A] self-center">
                  {isPro ? "Unlimited" : `${quota?.remaining ?? 3} / 3`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROJECTS */}
        {activeTab === "plans" && (
          <div>
            {/* Header Seksi */}
            <div className="pb-6 border-b border-white/[.08] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
                <p className="mt-1 text-xs text-white/50">Daftar riwayat plan produk yang pernah dibuat.</p>
              </div>
              <Link
                href="/new"
                className="flex items-center gap-1.5 rounded-md bg-[#74FA6A] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
              >
                <Plus size={13} /> Buat Plan
              </Link>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="py-6 flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Cari project…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 rounded-md border border-white/10 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:border-[#74FA6A]/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`rounded px-2.5 py-1 ${statusFilter === "all" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                >
                  Semua ({plans.length})
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`rounded px-2.5 py-1 ${statusFilter === "active" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                >
                  Berjalan
                </button>
                <button
                  onClick={() => setStatusFilter("done")}
                  className={`rounded px-2.5 py-1 ${statusFilter === "done" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {/* Flat List Projects */}
            {plansLoading ? (
              <div className="flex items-center justify-center py-16 text-white/30">
                <Loader2 size={16} className="animate-spin mr-2" />
                <span className="text-xs font-mono">Memuat project…</span>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40 border-t border-white/[.06]">
                Belum ada project yang cocok.
              </div>
            ) : (
              <div className="divide-y divide-white/[.06]">
                {filteredPlans.map((plan) => {
                  const pct = plan.taskCount > 0 ? Math.round((plan.tasksDone / plan.taskCount) * 100) : 0;
                  return (
                    <div key={plan.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/project/${plan.id}`} className="text-xs font-semibold text-white hover:text-[#74FA6A] truncate">
                            {plan.title}
                          </Link>
                          <span className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                            plan.status === "done" ? "bg-[#74FA6A]/10 text-[#74FA6A]" : "bg-white/10 text-white/50"
                          }`}>
                            {plan.status}
                          </span>
                        </div>
                        <p className="font-mono text-[10.5px] text-white/40 mt-1">
                          {plan.featureCount} Fase • {plan.tasksDone}/{plan.taskCount} Task ({pct}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/project/${plan.id}`}
                          className="rounded border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white"
                        >
                          Buka
                        </Link>
                        <button
                          onClick={() => setPlanToDelete(plan)}
                          className="p-1 text-white/30 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLI TOKENS */}
        {activeTab === "tokens" && (
          <div>
            {/* Header Seksi */}
            <div className="pb-6 border-b border-white/[.08] flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">CLI Tokens</h1>
                <p className="mt-1 text-xs text-white/50">Token otentikasi untuk agent CLI di terminal Anda.</p>
              </div>
              <button
                onClick={createToken}
                disabled={creatingToken}
                className="flex items-center gap-1.5 rounded-md bg-[#74FA6A] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
              >
                <Plus size={13} /> Buat Token
              </button>
            </div>

            {newToken && (
              <div className="my-6 rounded-lg border border-[#74FA6A]/30 bg-[#74FA6A]/[0.05] p-3">
                <div className="flex items-center justify-between text-xs text-[#74FA6A] font-mono">
                  <span>Token Baru Dibuat:</span>
                  <button
                    onClick={() => handleCopy(newToken, "new-token")}
                    className="flex items-center gap-1 rounded bg-[#74FA6A] px-2 py-0.5 text-black font-bold"
                  >
                    {copiedToken === "new-token" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedToken === "new-token" ? "Tersalin" : "Salin"}
                  </button>
                </div>
                <code className="mt-1 block break-all text-xs font-mono text-white/90 bg-black/60 p-2 rounded">
                  {newToken}
                </code>
              </div>
            )}

            {/* Flat List Tokens */}
            <div className="py-6 divide-y divide-white/[.06]">
              {tokens.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/40">Belum ada CLI token.</p>
              ) : (
                tokens.map((t) => (
                  <div key={t.hash} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{t.label}</span>
                        <span className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                          t.revoked ? "bg-red-500/10 text-red-400" : "bg-[#74FA6A]/10 text-[#74FA6A]"
                        }`}>
                          {t.revoked ? "Dicabut" : "Aktif"}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-white/30 mt-0.5">{t.hash.slice(0, 16)}…</p>
                    </div>

                    {!t.revoked && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(`scratch-agent login --token ${t.hash} --url ${origin || "https://www.scratchagent.web.id"}`, t.hash)}
                          className="rounded border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white flex items-center gap-1"
                        >
                          {copiedToken === t.hash ? <Check size={11} className="text-[#74FA6A]" /> : <Copy size={11} />}
                          <span>Salin Login</span>
                        </button>
                        <button
                          onClick={() => revokeToken(t.hash)}
                          className="p-1 text-white/30 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY */}
        {activeTab === "security" && (
          <div>
            {/* Header Seksi */}
            <div className="pb-6 border-b border-white/[.08]">
              <h1 className="text-2xl font-bold tracking-tight text-white">Security</h1>
              <p className="mt-1 text-xs text-white/50">Pengaturan kredensial keamanan akun Anda.</p>
            </div>

            <div className="py-8 max-w-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70">Password Baru</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimal 6 karakter…"
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 pr-9 text-xs text-white focus:border-[#74FA6A]/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {passMsg && (
                <p className={`text-xs ${passMsgType === "success" ? "text-[#74FA6A]" : "text-red-400"}`}>
                  {passMsg}
                </p>
              )}

              <button
                onClick={handleChangePass}
                className="rounded-md bg-[#74FA6A] px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: LLM (Admin only) */}
        {activeTab === "llm" && isAdmin && (
          <div>
            {/* Header Seksi */}
            <div className="pb-6 border-b border-white/[.08] flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">LLM Configuration</h1>
                <p className="mt-1 text-xs text-white/50">Atur provider failover generator AI plan.</p>
              </div>
              <button
                onClick={addProvider}
                className="flex items-center gap-1 rounded border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white"
              >
                <Plus size={12} /> Tambah Backup
              </button>
            </div>

            <div className="py-6 space-y-4">
              {providers.map((p, i) => {
                const test = testResults[i];
                return (
                  <div key={i} className="p-4 rounded-lg border border-white/[.06] bg-black/30 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#74FA6A] font-semibold">{i === 0 ? "1. Provider Utama" : `${i + 1}. Backup ${i}`}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveProvider(i, -1)} disabled={i === 0} className="p-1 text-white/30 hover:text-white disabled:opacity-20"><ArrowUp size={12} /></button>
                        <button onClick={() => moveProvider(i, 1)} disabled={i === providers.length - 1} className="p-1 text-white/30 hover:text-white disabled:opacity-20"><ArrowDown size={12} /></button>
                        {providers.length > 1 && (
                          <button onClick={() => removeProvider(i)} className="p-1 text-white/30 hover:text-red-400"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10.5px] font-mono text-white/40">Base URL</label>
                        <input
                          type="text"
                          value={p.baseUrl}
                          onChange={(e) => updateProvider(i, { baseUrl: e.target.value })}
                          className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white font-mono focus:border-[#74FA6A]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-mono text-white/40">API Key</label>
                        <div className="relative mt-1">
                          <input
                            type={showApiKeys[i] ? "text" : "password"}
                            value={p.apiKey}
                            onChange={(e) => updateProvider(i, { apiKey: e.target.value })}
                            placeholder={p.apiKeySet ? "Tersimpan" : "sk-..."}
                            className="w-full rounded border border-white/10 bg-black px-2 py-1 pr-7 text-xs text-white font-mono focus:border-[#74FA6A]/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKeys((prev) => ({ ...prev, [i]: !prev[i] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                          >
                            {showApiKeys[i] ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono text-white/40">Daftar Model</label>
                      <input
                        type="text"
                        value={p.models}
                        onChange={(e) => updateProvider(i, { models: e.target.value })}
                        className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white font-mono focus:border-[#74FA6A]/50 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={() => testProvider(i)}
                        disabled={test?.testing}
                        className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-xs text-white/60 hover:text-white font-mono"
                      >
                        <Play size={10} className={test?.testing ? "animate-spin" : ""} />
                        <span>{test?.testing ? "Menguji…" : "Tes Koneksi"}</span>
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
                disabled={llmSaving}
                className="rounded-md bg-[#74FA6A] px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
              >
                {llmSaving ? "Menyimpan…" : "Simpan Konfigurasi"}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Modal Hapus */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#121517] p-4">
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <AlertTriangle size={15} />
              <span>Hapus Project?</span>
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              Project &quot;{planToDelete.title}&quot; akan dihapus permanen.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2 text-xs">
              <button onClick={() => setPlanToDelete(null)} className="px-2.5 py-1 text-white/60 hover:text-white">
                Batal
              </button>
              <button
                onClick={confirmDeletePlan}
                disabled={deletingId !== null}
                className="rounded bg-red-500 px-3 py-1 font-semibold text-white hover:bg-red-600"
              >
                {deletingId ? "Menghapus…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded border border-white/10 bg-[#121517] px-3.5 py-1.5 text-xs text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
