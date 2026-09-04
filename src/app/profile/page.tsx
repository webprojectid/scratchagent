"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
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
  ArrowUpRight,
  ShieldCheck,
  Play,
  ArrowUp,
  ArrowDown,
  Layers,
  RefreshCw,
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

      // Fetch LLM config if admin
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

  // LLM handlers (Admin only)
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
    <Shell back="/" sidebar={false}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 md:pt-10">
        {/* Main Master-Detail Split Container */}
        <div className="flex flex-col rounded-2xl border border-white/[.08] bg-[#0E1113] md:flex-row overflow-hidden shadow-2xl">
          
          {/* LEFT SIDEBAR: Navigation Panel */}
          <aside className="w-full shrink-0 border-b border-white/[.08] bg-[#0B0D0F] p-4 md:w-64 md:border-b-0 md:border-r">
            {/* User Identity Mini Banner */}
            <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#74FA6A]/10 font-mono text-xs font-bold text-[#74FA6A]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className="truncate font-mono text-[10.5px] text-white/40">{user.email}</p>
              </div>
            </div>

            {/* Navigation Sections */}
            <nav className="mt-5 space-y-4">
              <div>
                <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Akun &amp; Workspace
                </p>
                <div className="mt-1.5 space-y-0.5">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      activeTab === "profile"
                        ? "bg-[#74FA6A]/15 text-[#74FA6A] font-semibold"
                        : "text-white/60 hover:bg-white/[.04] hover:text-white"
                    }`}
                  >
                    <User size={14} className={activeTab === "profile" ? "text-[#74FA6A]" : "text-white/40"} />
                    <span>Profil &amp; Kuota</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("plans")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      activeTab === "plans"
                        ? "bg-[#74FA6A]/15 text-[#74FA6A] font-semibold"
                        : "text-white/60 hover:bg-white/[.04] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderOpen size={14} className={activeTab === "plans" ? "text-[#74FA6A]" : "text-white/40"} />
                      <span>History Project</span>
                    </div>
                    <span className="rounded bg-white/[.06] px-1.5 py-0.2 font-mono text-[10px] text-white/40">
                      {plans.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("tokens")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      activeTab === "tokens"
                        ? "bg-[#74FA6A]/15 text-[#74FA6A] font-semibold"
                        : "text-white/60 hover:bg-white/[.04] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Terminal size={14} className={activeTab === "tokens" ? "text-[#74FA6A]" : "text-white/40"} />
                      <span>CLI Token</span>
                    </div>
                    <span className="rounded bg-white/[.06] px-1.5 py-0.2 font-mono text-[10px] text-white/40">
                      {tokens.filter((t) => !t.revoked).length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("security")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      activeTab === "security"
                        ? "bg-[#74FA6A]/15 text-[#74FA6A] font-semibold"
                        : "text-white/60 hover:bg-white/[.04] hover:text-white"
                    }`}
                  >
                    <Shield size={14} className={activeTab === "security" ? "text-[#74FA6A]" : "text-white/40"} />
                    <span>Keamanan Akun</span>
                  </button>
                </div>
              </div>

              {/* Developer Zone (If Admin) */}
              {isAdmin && (
                <div>
                  <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Developer Zone
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    <button
                      onClick={() => setActiveTab("llm")}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                        activeTab === "llm"
                          ? "bg-[#74FA6A]/15 text-[#74FA6A] font-semibold"
                          : "text-white/60 hover:bg-white/[.04] hover:text-white"
                      }`}
                    >
                      <Cpu size={14} className={activeTab === "llm" ? "text-[#74FA6A]" : "text-white/40"} />
                      <span>Konfigurasi LLM</span>
                    </button>

                    <Link
                      href="/admin/users"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/60 hover:bg-white/[.04] hover:text-white"
                    >
                      <ShieldCheck size={14} className="text-[#74FA6A]" />
                      <span>Developer Setting</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Footer Actions in Sidebar */}
              <div className="pt-2 border-t border-white/[.06]">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut size={14} />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* RIGHT MAIN PANEL: Content View */}
          <main className="min-w-0 flex-1 p-6 md:p-8">
            
            {/* TAB 1: PROFILE & QUOTA */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-white">Profil &amp; Penggunaan</h2>
                  <p className="text-xs text-white/40">Informasi langganan akun dan status limitasi harian.</p>
                </div>

                {/* Identity Box */}
                <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] font-mono text-base font-bold text-[#74FA6A]">
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
                                className="rounded border border-[#74FA6A]/50 bg-black/60 px-2 py-0.5 text-xs font-semibold text-white focus:outline-none"
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
                              <span className="text-xs font-semibold text-white">{user.name}</span>
                              <button
                                onClick={() => {
                                  setNameInput(user.name);
                                  setEditingName(true);
                                }}
                                className="text-white/30 hover:text-white"
                                title="Ubah nama"
                              >
                                <Pencil size={11} />
                              </button>
                            </>
                          )}

                          <span
                            className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider font-semibold ${
                              isPro
                                ? "bg-[#74FA6A]/15 text-[#74FA6A] border border-[#74FA6A]/30"
                                : "bg-white/[.06] text-white/50 border border-white/[.08]"
                            }`}
                          >
                            {isPro ? "Pro Member" : "Free Tier"}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-white/40">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPro && (
                        <Link
                          href="/pricing"
                          className="flex items-center gap-1.5 rounded-lg border border-[#74FA6A]/40 bg-[#74FA6A]/10 px-3 py-1.5 text-xs font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/20"
                        >
                          <Sparkles size={12} /> Upgrade Pro
                        </Link>
                      )}
                      <Link
                        href="/new"
                        className="flex items-center gap-1.5 rounded-lg bg-[#74FA6A] px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
                      >
                        <Plus size={13} /> Buat Plan
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-3.5">
                    <div className="flex items-center justify-between font-mono text-[10.5px] text-white/40">
                      <span>KUOTA GENERATE</span>
                      <Zap size={12} className="text-[#74FA6A]" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold tracking-tight text-white">
                        {isPro ? "Unlimited" : `${quota?.remaining ?? 3} / 3`}
                      </span>
                      {!isPro && <span className="text-[10px] text-white/40">tersisa</span>}
                    </div>
                    <p className="mt-1 text-[10.5px] text-white/40">
                      {isPro ? "Tanpa limit generate plan" : "Reset rolling 24 jam"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-3.5">
                    <div className="flex items-center justify-between font-mono text-[10.5px] text-white/40">
                      <span>TOTAL PROJECT</span>
                      <FolderOpen size={12} className="text-white/40" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold tracking-tight text-white">{plans.length}</span>
                      <span className="text-[10px] text-[#74FA6A]">({donePlansCount} selesai)</span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-white/40">Arsip PRD dalam akun</p>
                  </div>

                  <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-3.5">
                    <div className="flex items-center justify-between font-mono text-[10.5px] text-white/40">
                      <span>TASK PROGRESS</span>
                      <Check size={12} className="text-white/40" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold tracking-tight text-white">{completionRate}%</span>
                      <span className="text-[10px] text-white/40">({doneTasks}/{totalTasks} tuntas)</span>
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-white/[.08]">
                      <div className="h-full rounded-full bg-[#74FA6A]" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HISTORY PROJECT */}
            {activeTab === "plans" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">History Project</h2>
                    <p className="text-xs text-white/40">Semua plan PRD dan rincian fase yang pernah disusun.</p>
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
                  <div className="flex items-center justify-center py-16 text-white/30">
                    <Loader2 size={15} className="animate-spin mr-2" />
                    <span className="text-xs font-mono">Memuat data project…</span>
                  </div>
                ) : filteredPlans.length === 0 ? (
                  <div className="py-14 text-center rounded-xl border border-white/[.06] bg-[#0A0D0F]">
                    <FolderOpen size={26} className="mx-auto text-white/20" />
                    <p className="mt-2 text-xs text-white/40">Belum ada project yang cocok.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[.04] rounded-xl border border-white/[.08] bg-[#0A0D0F] p-2">
                    {filteredPlans.map((plan) => {
                      const pct = plan.taskCount > 0 ? Math.round((plan.tasksDone / plan.taskCount) * 100) : 0;
                      return (
                        <div key={plan.id} className="flex flex-col justify-between gap-2.5 p-3 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/project/${plan.id}`}
                                className="truncate text-xs font-medium text-white/90 hover:text-[#74FA6A]"
                              >
                                {plan.title}
                              </Link>
                              <span
                                className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                                  plan.status === "done"
                                    ? "bg-[#74FA6A]/10 text-[#74FA6A]"
                                    : plan.status === "generating"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-white/10 text-white/50"
                                }`}
                              >
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
                              onClick={(e) => {
                                e.preventDefault();
                                setPlanToDelete(plan);
                              }}
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
            )}

            {/* TAB 3: CLI TOKENS */}
            {activeTab === "tokens" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Manajemen Token CLI</h2>
                    <p className="text-xs text-white/40">Gunakan token ini untuk otentikasi CLI coding agent di terminal Anda.</p>
                  </div>
                  <button
                    onClick={createToken}
                    disabled={creatingToken}
                    className="flex items-center gap-1 rounded-md bg-[#74FA6A] px-2.5 py-1 text-xs font-semibold text-black transition hover:bg-[#A8FF9B] disabled:opacity-50"
                  >
                    {creatingToken ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Buat Token Baru
                  </button>
                </div>

                {/* Token Baru Alert */}
                {newToken && (
                  <div className="rounded-lg border border-[#74FA6A]/30 bg-[#74FA6A]/[0.05] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10.5px] font-semibold text-[#74FA6A]">
                        Token Berhasil Dibuat (Simpan Sekarang):
                      </span>
                      <button
                        onClick={() => handleCopy(newToken, "new-tok")}
                        className="flex items-center gap-1 rounded bg-[#74FA6A] px-2 py-0.5 font-mono text-[10px] font-bold text-black"
                      >
                        {copiedToken === "new-tok" ? <Check size={10} /> : <Copy size={10} />}
                        {copiedToken === "new-tok" ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                    <code className="mt-1.5 block break-all rounded bg-black/60 p-2 font-mono text-xs text-white">
                      {newToken}
                    </code>
                  </div>
                )}

                {/* List Token */}
                <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[.06] font-mono text-[10.5px] text-white/40">
                    <span>LABEL &amp; HASH TOKEN</span>
                    <span>STATUS / AKSI</span>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {tokens.length === 0 ? (
                      <p className="py-6 text-center text-xs text-white/30">Belum ada CLI token aktif.</p>
                    ) : (
                      tokens.map((t) => (
                        <div
                          key={t.hash}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/[.04] bg-white/[.01] px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-white/90 mr-2">{t.label}</span>
                            <span className="font-mono text-[10px] text-white/30">({t.hash.slice(0, 12)}…)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.2 font-mono text-[8.5px] font-bold uppercase ${
                                t.revoked ? "bg-red-500/15 text-red-400" : "bg-[#74FA6A]/15 text-[#74FA6A]"
                              }`}
                            >
                              {t.revoked ? "Dicabut" : "Aktif"}
                            </span>
                            {!t.revoked && (
                              <>
                                <button
                                  onClick={() => handleCopy(`scratch-agent login --token ${t.hash} --url ${origin || "https://www.scratchagent.web.id"}`, t.hash)}
                                  className="rounded p-1 text-white/40 hover:text-white"
                                  title="Salin Command Login"
                                >
                                  {copiedToken === t.hash ? <Check size={12} className="text-[#74FA6A]" /> : <Copy size={12} />}
                                </button>
                                <button
                                  onClick={() => revokeToken(t.hash)}
                                  className="rounded p-1 text-white/30 hover:text-red-400"
                                  title="Cabut Token"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Command Quick Guide */}
                <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-4 font-mono text-xs text-white/60 space-y-2">
                  <p className="font-sans text-xs font-semibold text-white">Sintaks Eksekusi di Terminal:</p>
                  <div className="flex items-center justify-between rounded bg-black/40 px-3 py-1.5">
                    <span className="truncate mr-2">1. scratch-agent login --token &lt;TOKEN&gt; --url {origin || "https://www.scratchagent.web.id"}</span>
                    <button
                      onClick={() => handleCopy(`scratch-agent login --token <TOKEN> --url ${origin || "https://www.scratchagent.web.id"}`, "login-cmd")}
                      className="text-white/40 hover:text-white"
                    >
                      {copiedToken === "login-cmd" ? <Check size={11} className="text-[#74FA6A]" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded bg-black/40 px-3 py-1.5">
                    <span className="truncate mr-2">2. scratch-agent run --plan &lt;PLAN_ID&gt;</span>
                    <button
                      onClick={() => handleCopy("scratch-agent run --plan <PLAN_ID>", "run-cmd")}
                      className="text-white/40 hover:text-white"
                    >
                      {copiedToken === "run-cmd" ? <Check size={11} className="text-[#74FA6A]" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY */}
            {activeTab === "security" && (
              <div className="max-w-md space-y-4">
                <div className="border-b border-white/[.06] pb-3">
                  <h2 className="text-sm font-semibold text-white">Keamanan Akun</h2>
                  <p className="text-xs text-white/40">Perbarui kata sandi lokal akun Anda.</p>
                </div>

                <div className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-4">
                  <label className="block text-xs font-medium text-white/80">Password Baru</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Minimal 6 karakter…"
                      className="w-full rounded-lg border border-white/[.08] bg-black/40 px-3 py-1.5 pr-8 text-xs text-white placeholder:text-white/30 focus:border-[#74FA6A]/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>

                  {passMsg && (
                    <p className={`mt-2 text-xs ${passMsgType === "success" ? "text-[#74FA6A]" : "text-red-400"}`}>
                      {passMsg}
                    </p>
                  )}

                  <button
                    onClick={handleChangePass}
                    className="mt-3 rounded-lg bg-[#74FA6A] px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-[#A8FF9B]"
                  >
                    Simpan Password
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: LLM CONFIGURATION (Admin only) */}
            {activeTab === "llm" && isAdmin && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Konfigurasi LLM Multi-Provider</h2>
                    <p className="text-xs text-white/40">Atur prioritas provider failover untuk engine generator plan.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-white/40">
                      Sumber: <strong className="text-[#74FA6A]">{llmCfg?.source === "database" ? "Database" : "ENV"}</strong>
                    </span>
                    <button
                      onClick={addProvider}
                      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[.03] px-2.5 py-1 text-xs text-white/80 hover:border-[#74FA6A]/40 hover:text-[#74FA6A]"
                    >
                      <Plus size={11} /> Tambah Backup
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {providers.map((p, i) => {
                    const test = testResults[i];
                    return (
                      <div key={i} className="rounded-xl border border-white/[.08] bg-[#0A0D0F] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-[#74FA6A]">
                            {i === 0 ? "1. Provider Utama" : `${i + 1}. Backup ${i}`}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveProvider(i, -1)}
                              disabled={i === 0}
                              className="rounded p-1 text-white/30 hover:text-white disabled:opacity-20"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              onClick={() => moveProvider(i, 1)}
                              disabled={i === providers.length - 1}
                              className="rounded p-1 text-white/30 hover:text-white disabled:opacity-20"
                            >
                              <ArrowDown size={12} />
                            </button>
                            {providers.length > 1 && (
                              <button
                                onClick={() => removeProvider(i)}
                                className="rounded p-1 text-white/30 hover:text-red-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <div>
                            <label className="block font-mono text-[10px] uppercase text-white/40">Base URL</label>
                            <input
                              type="text"
                              value={p.baseUrl}
                              onChange={(e) => updateProvider(i, { baseUrl: e.target.value })}
                              placeholder="https://api.openai.com/v1"
                              className="mt-1 w-full rounded-md border border-white/[.08] bg-black/40 px-2.5 py-1 text-xs text-white focus:border-[#74FA6A]/40 focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] uppercase text-white/40">API Key</label>
                            <div className="relative mt-1">
                              <input
                                type={showApiKeys[i] ? "text" : "password"}
                                value={p.apiKey}
                                onChange={(e) => updateProvider(i, { apiKey: e.target.value })}
                                placeholder={p.apiKeySet ? "Tersimpan (isi untuk ganti)" : "sk-..."}
                                className="w-full rounded-md border border-white/[.08] bg-black/40 px-2.5 py-1 pr-7 text-xs text-white focus:border-[#74FA6A]/40 focus:outline-none font-mono"
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
                          <label className="block font-mono text-[10px] uppercase text-white/40">Daftar Model (Koma / Baris Baru)</label>
                          <textarea
                            rows={1}
                            value={p.models}
                            onChange={(e) => updateProvider(i, { models: e.target.value })}
                            placeholder="gpt-4o-mini, gpt-4o"
                            className="mt-1 w-full rounded-md border border-white/[.08] bg-black/40 px-2.5 py-1 text-xs text-white focus:border-[#74FA6A]/40 focus:outline-none font-mono resize-y"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <button
                            type="button"
                            onClick={() => testProvider(i)}
                            disabled={test?.testing}
                            className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] font-mono text-white/70 hover:text-white"
                          >
                            <Play size={10} className={test?.testing ? "animate-spin" : ""} />
                            {test?.testing ? "Menguji…" : "Tes Koneksi"}
                          </button>
                          {test && (
                            <span className={`font-mono text-[11px] ${test.ok ? "text-[#74FA6A]" : "text-red-400"}`}>
                              {test.ok ? `✓ ${test.model} (${test.latencyMs}ms)` : test.error}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    onClick={saveLlm}
                    disabled={llmSaving}
                    className="flex items-center gap-1.5 rounded-lg bg-[#74FA6A] px-4 py-2 text-xs font-semibold text-black hover:bg-[#A8FF9B] disabled:opacity-50"
                  >
                    {llmSaving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                    {llmSaving ? "Menyimpan…" : "Simpan Konfigurasi"}
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* Delete Modal */}
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
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-white/10 bg-[#14171A] px-3 py-1.5 text-xs text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </Shell>
  );
}
