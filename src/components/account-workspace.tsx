"use client";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";
import { BrandMark } from "@/components/brand-mark";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAccountSettings } from "@/components/account-settings-state";
const AccountLanguage = dynamic(() => import("./account-panels").then(module => module.AccountLanguage));
const AccountActivity = dynamic(() => import("./account-panels").then(module => module.AccountActivity));
const AccountLibrary = dynamic(() => import("./account-panels").then(module => module.AccountLibrary));
const HandoffPreferences = dynamic(() => import("./account-panels").then(module => module.HandoffPreferences));
const NotificationPreferences = dynamic(() => import("./account-panels").then(module => module.NotificationPreferences));
const AccountPrivacy = dynamic(() => import("./account-panels").then(module => module.AccountPrivacy));
const AccountSessions = dynamic(() => import("./account-panels").then(module => module.AccountSessions));
const UsageHistory = dynamic(() => import("./account-panels").then(module => module.UsageHistory));
import { defaultDisplay, type DisplaySettings, type ProfileSettings } from "@/lib/account-preferences";
import panelStyles from "@/components/account-panels.module.css";
import { Activity, BookOpen, FileText, Bell, LockKeyhole } from "lucide-react";
const ProfileOverview = dynamic(() => import("./profile-overview").then(module => module.ProfileOverview));
const ProfileDashboard = dynamic(() => import("./profile-dashboard").then(module => module.ProfileDashboard));
import { filterTokens } from "@/lib/account-dashboard";
const ProjectLedger = dynamic(() => import("./project-ledger").then(module => module.ProjectLedger));
import { AccountBadges } from "@/components/account-badges";

import { effectiveAccountTier } from "@/lib/account-membership";
import accountStyles from "@/app/profile/account-ledger.module.css";
import { accountAreaForTab, accountTabHref, defaultAccountTab, isAccountTab, type AccountArea, type AccountTab } from "@/lib/account-navigation";
import {
  User,
  Shield,
  FolderOpen,
  Terminal,
  Cpu,
  LogOut,
  Plus,
  Crown,
  ChartNoAxesColumn,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Settings,
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
  emailVerified?: boolean;
};

type PlanSummary = {
  id: string;
  title: string;
  brief?: string;
  status: string;
  createdAt: string | undefined;
  stack: string[];
  featureCount: number;
  taskCount: number;
  tasksDone: number;
  tasksActive: number;
  tasksFailed: number;
  favorite?: boolean; archived?: boolean; lastOpenedAt?: string | null;
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
  revokedAt?: string | null;
  createdAt?: string;
  expiresAt?: string | null; lastUsedAt?: string | null; access?: "read" | "write"; projectIds?: string[];
};

type NavTab = AccountTab;
type AccountPreferences = DisplaySettings;
const initialPreferences: AccountPreferences = defaultDisplay;
const previewMode = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

export function AccountWorkspace({ area, initialTab }: { area: AccountArea; initialTab: AccountTab }) {
  useUiLanguage();
  const router = useRouter();
  const isProfileArea = area === "profile";
  const [tokenNow, setTokenNow] = useState(() => Date.now()); useEffect(() => { const timer = window.setInterval(() => setTokenNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [preferences, setPreferences] = useState<AccountPreferences>(initialPreferences);
  const [savedPreferences, setSavedPreferences] = useState<AccountPreferences>(initialPreferences);
  const preferencesDirty = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [user, setUser] = useState<UserData | null>(null);
  const accountSettings = useAccountSettings(user?.email, previewMode());
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [tokenLabel, setTokenLabel] = useState("");
  const [tokenDays, setTokenDays] = useState<7 | 30 | 90>(30);
  const [tokenAccess, setTokenAccess] = useState<"read" | "write">("write");
  const [tokenProject, setTokenProject] = useState("");
  useEffect(() => { if (!accountSettings.loading && !accountSettings.error && !preferencesReady) { setPreferences(accountSettings.data.display); setSavedPreferences(accountSettings.data.display); setPreferencesReady(true); } }, [accountSettings.loading, accountSettings.error, accountSettings.data.display, preferencesReady]);

  // Plans state
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const projectDraftState = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Quota & Tokens state
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quotaError, setQuotaError] = useState(false);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokensError, setTokensError] = useState(false);
  const [tokenGroup, setTokenGroup] = useState<"active" | "revoked" | "expired">("active");
  const [tokenRecent, setTokenRecent] = useState(true);
  const [tokenToRevoke, setTokenToRevoke] = useState<TokenItem | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Security / Pass state
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState("");
  const [passMsgType, setPassMsgType] = useState<"error" | "success">("error");

  // Profile Name Edit

  const loadedResources = useRef({ plans: false, tokens: false });

  useEffect(() => {
    let active = true;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    setActiveTab(isAccountTab(requestedTab) && accountAreaForTab(requestedTab) === area ? requestedTab : defaultAccountTab(area));
    try {
      const stored = JSON.parse(localStorage.getItem("scratch_account_preferences") || "{}");
      const loadedPreferences: AccountPreferences = {
        ...defaultDisplay,
        density: stored.density === "compact" ? "compact" : "comfortable",
        motion: stored.motion === "reduced" ? "reduced" : "system",
        badgeMotion: stored.badgeMotion === "animated" || stored.badgeMotion === "reduced" ? stored.badgeMotion : "system",
        defaultFilter: stored.defaultFilter === "active" || stored.defaultFilter === "done" ? stored.defaultFilter : "all",
      };
      setPreferences(loadedPreferences);
      setSavedPreferences(loadedPreferences);
    } catch { /* The saved preference can be reset from this screen. */ }

    const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (isPreview) {
      const previewAccount = new URLSearchParams(window.location.search).get("previewAccount") || "pro";
      const previewAdmin = previewAccount === "admin" || previewAccount === "admin-pro";
      const previewPro = previewAccount === "pro" || previewAccount === "admin-pro";
      setUser({
        email: "demo@scratchagent.test",
        name: "Demo Developer",
        role: previewAdmin ? "admin" : "user",
        tier: previewPro ? "pro" : "free",
        createdAt: "2026-01-15T00:00:00Z",
        proExpiresAt: previewPro ? "2027-01-15T00:00:00Z" : null,
        proActive: previewPro,
      });
      setQuota({ remaining: previewPro || previewAdmin ? 10 : 3, limit: previewPro || previewAdmin ? 10 : 3, tier: previewPro ? "pro" : "free", unlimited: previewPro || previewAdmin });
      setQuotaLoading(false);
      setPlans([
        { id: "demo", title: "Aplikasi HabitKu", brief: "Aplikasi pelacak kebiasaan harian dengan insight AI dan gamifikasi.", status: "implementing", createdAt: "2025-03-12T07:32:00Z", stack: ["Next.js", "PostgreSQL"], featureCount: 5, taskCount: 20, tasksDone: 12, tasksActive: 2, tasksFailed: 0 },
        { id: "demo-2", title: "TokoOnline Pro", brief: "Platform e-commerce untuk UMKM dengan manajemen stok otomatis.", status: "implementing", createdAt: "2025-03-10T02:15:00Z", stack: ["React", "Node.js"], featureCount: 5, taskCount: 20, tasksDone: 16, tasksActive: 1, tasksFailed: 0 },
        { id: "demo-3", title: "Platform Belajar", brief: "MVP platform pembelajaran online dengan konten interaktif.", status: "implementing", createdAt: "2025-03-08T09:20:00Z", stack: ["Next.js"], featureCount: 5, taskCount: 24, tasksDone: 16, tasksActive: 2, tasksFailed: 0 },
        { id: "demo-4", title: "Sistem Manajemen Tim", brief: "Alat kolaborasi tim dengan task, timeline, dan laporan otomatis.", status: "done", createdAt: "2025-03-05T04:08:00Z", stack: ["Next.js"], featureCount: 5, taskCount: 28, tasksDone: 28, tasksActive: 0, tasksFailed: 0 },
        { id: "demo-5", title: "Landing Page Marketing", brief: "Landing page untuk kampanye produk dengan optimasi SEO.", status: "ready", createdAt: "2025-03-01T03:45:00Z", stack: ["React"], featureCount: 4, taskCount: 12, tasksDone: 3, tasksActive: 0, tasksFailed: 0 },
      ]);
      setPlansLoading(false);
      setTokensLoading(false);
      return;
    }

    refreshCurrentUser();
    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.push("/login");
        return;
      }
      setUser((prev) => ({ ...prev, ...u }));
    });

    if (isProfileArea) fetch("/api/generate")
      .then((r) => { if (!r.ok) throw new Error("Gagal memuat kuota"); return r.json(); })
      .then((q) => {
        if (active) { setQuota(q); setQuotaError(false); setQuotaLoading(false); }
      })
      .catch(() => { if (active) { setQuotaError(true); setQuotaLoading(false); } });

    return () => {
      active = false;
    };
  }, [router, area, isProfileArea]);

  useEffect(() => {
    const syncTab = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveTab(isAccountTab(tab) && accountAreaForTab(tab) === area ? tab : defaultAccountTab(area));
    };
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, [area]);

  useEffect(() => {
    if (previewMode() || !user?.email || loadedResources.current.plans || !(isProfileArea || activeTab === "tokens")) return;
    const controller = new AbortController();
    fetch(`/api/plans/list?userId=${encodeURIComponent(user.email)}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(ui("Gagal memuat proyek")); return r.json(); })
      .then(data => { if (controller.signal.aborted) return; loadedResources.current.plans = true; setPlans(data.plans || []); setPlansError(false); setPlansLoading(false); })
      .catch(() => { if (!controller.signal.aborted) { setPlansError(true); setPlansLoading(false); } });
    return () => controller.abort();
  }, [user?.email, activeTab, isProfileArea]);

  useEffect(() => {
    if (previewMode() || !user?.email || activeTab !== "tokens" || loadedResources.current.tokens) return;
    const controller = new AbortController();
    fetch("/api/tokens", { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(ui("Gagal memuat token")); return r.json(); })
      .then(data => { if (controller.signal.aborted) return; loadedResources.current.tokens = true; setTokens(Array.isArray(data) ? data : []); setTokensError(false); setTokensLoading(false); })
      .catch(() => { if (!controller.signal.aborted) { setTokensError(true); setTokensLoading(false); } });
    return () => controller.abort();
  }, [user?.email, activeTab]);

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

  const handleSaveName = async (value: string, profile: ProfileSettings) => {
    await accountSettings.save("profile", profile);
    if (!value.trim() || !user) {
      return;
    }
    const updatedName = value.trim();
    if (previewMode()) { setUser((prev) => prev ? { ...prev, name: updatedName } : null); return; }
    const response = await fetch(`/api/me?userId=${encodeURIComponent(user.email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: updatedName }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || ui("Profil belum bisa disimpan. Coba lagi."));
    setUser((prev) => (prev ? { ...prev, name: result.name } : null));

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
    } catch {}
    refreshCurrentUser();
  };

  const savePreferences = async () => {
    setPreferencesSaving(true); setPreferencesError("");
    try { await accountSettings.save("display", preferences); setSavedPreferences(preferences); setPreferencesSaved(true); }
    catch (cause) { setPreferencesSaved(false); setPreferencesError(cause instanceof Error ? cause.message : ui("Pengaturan belum tersimpan.")); }
    finally { setPreferencesSaving(false); }
  };

  const navigateTab = (tab: NavTab) => {
    const href = accountTabHref(tab, window.location.search);
    if (accountAreaForTab(tab) !== area) { router.push(href); return; }
    setActiveTab(tab);
    window.history.pushState(null, "", href);
  };

  const handleChangePass = async () => {
    if (previewMode()) { setPassMsg(ui("Pratinjau: kata sandi akun asli tidak diubah.")); setPassMsgType("success"); return; }
    if (!user) return;
    if (!oldPass) {
      setPassMsg(ui("Masukkan password lama."));
      setPassMsgType("error");
      return;
    }
    if (newPass.length < 6) {
      setPassMsg(ui("Password baru minimal 6 karakter."));
      setPassMsgType("error");
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg(ui("Konfirmasi password baru tidak cocok."));
      setPassMsgType("error");
      return;
    }

    setPassLoading(true);
    setPassMsg("");

    try {
      if (supabaseConfigured()) {
        const supabase = createClient();
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPass,
        });

        if (signInErr) {
          setPassMsg(ui("Password lama salah."));
          setPassMsgType("error");
          setPassLoading(false);
          return;
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPass,
        });

        if (updateErr) {
          setPassMsg(updateErr.message || "Gagal memperbarui password.");
          setPassMsgType("error");
          setPassLoading(false);
          return;
        }

        setPassMsg(ui("Password berhasil diperbarui!"));
        setPassMsgType("success");
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
        setTimeout(() => setPassMsg(""), 3500);
        setPassLoading(false);
        return;
      }

      const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
      const userKey = user.email.toLowerCase();
      if (storedUsers[userKey]) {
        if (storedUsers[userKey].password !== oldPass) {
          setPassMsg(ui("Password lama salah."));
          setPassMsgType("error");
          setPassLoading(false);
          return;
        }
        storedUsers[userKey].password = newPass;
        localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
        setPassMsg(ui("Password berhasil diperbarui!"));
        setPassMsgType("success");
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
        setTimeout(() => setPassMsg(""), 3500);
      } else {
        setPassMsg(ui("Akun tidak terdaftar pada sesi lokal."));
        setPassMsgType("error");
      }
    } catch {
      setPassMsg(ui("Terjadi kesalahan sistem saat memperbarui password."));
      setPassMsgType("error");
    } finally {
      setPassLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setToast(ui("Could not copy. Select the token and copy it manually."));
    }
  };

  const createToken = async () => {
    if (previewMode()) { setToast(ui("Pratinjau: token tidak dibuat.")); return; }
    setCreatingToken(true);
    try {
      const u = await getCurrentUser();
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: tokenLabel.trim() || `CLI-${new Date().toLocaleDateString(uiLocale())}`, days: tokenDays, access: tokenAccess, projectIds: tokenProject ? [tokenProject] : [], userId: u?.email }),
      });
      const data = await res.json();
      if (data.token) {
        setNewToken(data.token);
        const tList = await fetch("/api/tokens").then((r) => r.json());
        if (Array.isArray(tList)) setTokens(tList);
      } else {
        setToast(data.error || ui("Token gagal dibuat."));
      }
    } catch {
      setToast(ui("Gagal menghubungi server token."));
    } finally {
      setCreatingToken(false);
    }
  };

  const revokeToken = async (hash: string) => {
    if (previewMode()) { setToast(ui("Pratinjau: token tidak dicabut.")); return; }
    try {
      const u = await getCurrentUser();
      const result = await fetch("/api/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, userId: u?.email }),
      });
      if (!result.ok) { setToast(ui("Token gagal dicabut. Coba lagi.")); return; }
      setTokens((prev) => prev.map((t) => (t.hash === hash ? { ...t, revoked: true, revokedAt: new Date().toISOString() } : t)));
      setToast(ui("Token berhasil dicabut."));
      setTokenToRevoke(null);
    } catch { setToast(ui("Gagal menghubungi server token.")); }
  };

  const confirmDeletePlan = async () => {
    if (previewMode()) { setPlanToDelete(null); return; }
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

  if (!user) return <div className={accountStyles.accountLoading} role="status"><Loader2 size={22} className="animate-spin"/><span>{ui("Memuat akun…")}</span></div>;

  const initials = (user.name || user.email || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const membershipTier = effectiveAccountTier(user);
  const isPro = membershipTier === "pro";
  const accountPlanLabel = membershipTier ? `Scratch ${isPro ? "Pro" : ui("Free")}` : ui("Paket belum terverifikasi");
  const isAdmin = user.role === "admin";
  const visibleTokens = filterTokens(tokens, tokenGroup, tokenRecent, tokenNow);
  return (
    <div className="relative min-h-screen">
      <div className={accountStyles.page} data-motion={preferences.motion}>
        <div className={accountStyles.frame}>
          <aside className={accountStyles.sidebar} aria-label={isProfileArea ? ui("Navigasi profil") : ui("Navigasi pengaturan")}>
            <div className={accountStyles.sidebarBrand}><span className={accountStyles.brandMark}><BrandMark className="h-[21px] w-[30px] shrink-0" /></span><strong>ScratchAgent</strong></div>
            <button type="button" className={accountStyles.mobileNavToggle} aria-expanded={mobileNavOpen} aria-controls="account-navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}><span>{isProfileArea ? ui("Menu profil") : ui("Menu pengaturan")} <AccountBadges account={user} compact reducedMotion={preferences.motion === "reduced"}/></span><span>{mobileNavOpen ? ui("Tutup") : ui("Buka")}</span></button>
            <nav id="account-navigation" className={mobileNavOpen ? accountStyles.navOpen : undefined} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a")) setMobileNavOpen(false); }}>
              <p className={accountStyles.navLabel}>ScratchAgent</p>
              <Link className={accountStyles.navItem} href="/"><ChartNoAxesColumn size={19}/>{ui("Ringkasan")}</Link>
              {isProfileArea ? <>
              <p className={accountStyles.navLabel}>{ui("Profil")}</p>
              <button className={activeTab === "dashboard" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "dashboard" ? "page" : undefined} onClick={() => navigateTab("dashboard")}><ChartNoAxesColumn size={17}/>{ui("Dashboard")}</button>
              <button className={activeTab === "profile" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "profile" ? "page" : undefined} onClick={() => navigateTab("profile")}><User size={17}/>{ui("Profil")}</button>
              <button className={activeTab === "plans" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "plans" ? "page" : undefined} onClick={() => navigateTab("plans")}><FolderOpen size={17}/>{ui("Proyek")}<span className={accountStyles.navCount}>{plans.length}</span></button>
              <button className={activeTab === "billing" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "billing" ? "page" : undefined} onClick={() => navigateTab("billing")}><Crown size={17}/>{ui("Billing &amp; Pemakaian")}</button>
              <button className={activeTab === "activity" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "activity" ? "page" : undefined} onClick={() => navigateTab("activity")}><Activity size={17}/>{ui("Aktivitas")}</button>
              <button className={activeTab === "library" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "library" ? "page" : undefined} onClick={() => navigateTab("library")}><BookOpen size={17}/>{ui("Pustaka pribadi")}</button>
              </> : <>
              <p className={accountStyles.navLabel}>{ui("Pengaturan")}</p>
              <button className={activeTab === "preferences" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "preferences" ? "page" : undefined} onClick={() => navigateTab("preferences")}><Settings size={17}/>{ui("Tampilan")}</button>
              <button className={activeTab === "language" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "language" ? "page" : undefined} onClick={() => navigateTab("language")}><BookOpen size={17}/>{ui("Language")}</button>
              <button className={activeTab === "security" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "security" ? "page" : undefined} onClick={() => navigateTab("security")}><Shield size={17}/>{ui("Keamanan")}</button>
              <button className={activeTab === "handoff" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "handoff" ? "page" : undefined} onClick={() => navigateTab("handoff")}><FileText size={17}/> PRD &amp; Handoff</button>
              <button className={activeTab === "notifications" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "notifications" ? "page" : undefined} onClick={() => navigateTab("notifications")}><Bell size={17}/>{ui("Notifikasi")}</button>
              <button className={activeTab === "privacy" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "privacy" ? "page" : undefined} onClick={() => navigateTab("privacy")}><LockKeyhole size={17}/>{ui("Privasi &amp; Data")}</button>
              <p className={accountStyles.navLabel}>{ui("Integrasi")}</p>
              <button className={activeTab === "tokens" ? accountStyles.navActive : accountStyles.navItem} aria-current={activeTab === "tokens" ? "page" : undefined} onClick={() => navigateTab("tokens")}><Terminal size={17}/> CLI &amp; API</button>
              {isAdmin && <Link className={accountStyles.navItem} href="/developer-settings"><Cpu size={17}/>Developer Setting</Link>}
              </>}
            </nav>
            <div className={accountStyles.sidebarFooter}><div className={accountStyles.avatar}>{initials}</div><div><strong>{user.name}</strong><AccountBadges account={user} compact reducedMotion={preferences.motion === "reduced"}/></div><button type="button" onClick={handleLogout} aria-label={ui("Keluar")}><LogOut size={17}/></button></div>
          </aside>
          <main className={accountStyles.content}>
        {activeTab === "dashboard" && <ProfileDashboard email={user.email} name={user.name} plans={plans} loading={plansLoading} error={plansError} preview={previewMode()} timezone={preferences.timezone} onProjects={() => navigateTab("plans")}/>}
        {activeTab === "profile" && (
          <ProfileOverview
            user={user}
            quota={quota}
            onSave={handleSaveName}
            profileSettings={accountSettings.data.profile}
            settingsLoading={accountSettings.loading}
            settingsError={accountSettings.error}
            onNavigate={navigateTab}
            reducedMotion={preferences.motion === "reduced"}
            preview={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1"}
          />
        )}

        {activeTab === "plans" && <ProjectLedger draftState={projectDraftState} reducedMotion={preferences.motion === "reduced"} plans={plans} loading={plansLoading} error={plansError} onRetry={() => window.location.reload()} compact={preferences.density === "compact"} defaultFilter={preferences.defaultFilter} userEmail={user.email} userName={user.name} preview={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1"} onDelete={setPlanToDelete} onUpdate={async (id, patch) => { if (!previewMode()) { const response = await fetch(`/api/plans/${id}/account-state?userId=${encodeURIComponent(user.email)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); } setPlans(current => current.map(plan => plan.id === id ? { ...plan, ...patch } : plan)); }} timezone={preferences.timezone} />}
        {activeTab === "activity" && <AccountActivity email={user.email} preview={previewMode()} timezone={preferences.timezone}/>}
        {activeTab === "library" && <AccountLibrary email={user.email} preview={previewMode()} timezone={preferences.timezone}/>}
        {activeTab === "handoff" && <HandoffPreferences value={accountSettings.data.handoff} onSave={value => accountSettings.save("handoff", value)} loading={accountSettings.loading} error={accountSettings.error} retry={accountSettings.reload} preview={previewMode()}/>}
        {activeTab === "language" && <AccountLanguage value={accountSettings.data.display} onSave={async value => { await accountSettings.save("display", value); setPreferences(value); setSavedPreferences(value); }} loading={accountSettings.loading} error={accountSettings.error} retry={accountSettings.reload} preview={previewMode()}/>}
        {activeTab === "notifications" && <NotificationPreferences value={accountSettings.data.notifications} onSave={value => accountSettings.save("notifications", value)} loading={accountSettings.loading} error={accountSettings.error} retry={accountSettings.reload} preview={previewMode()}/>}
        {activeTab === "privacy" && <AccountPrivacy email={user.email} preview={previewMode()}/>}
        {activeTab === "tokens" && <section className={accountStyles.tokens} aria-labelledby="tokens-title">
          <div className={accountStyles.tokenHeader}><div><p className={accountStyles.eyebrow}>{ui("DEVELOPER / CLI &amp; API")}</p><h1 id="tokens-title">CLI &amp; API</h1><p>{ui("Kelola token akses untuk ScratchAgent CLI dan agent di terminal Anda.")}</p></div><button type="button" onClick={createToken} disabled={creatingToken}><Plus size={17}/> {creatingToken ? ui("Membuat…") : ui("Buat token")}</button></div>
          <form className={panelStyles.panel} onSubmit={event => { event.preventDefault(); void createToken(); }}><div className={panelStyles.grid}><label className={panelStyles.field}>{ui("Nama token")}<input maxLength={80} value={tokenLabel} onChange={event => setTokenLabel(event.target.value)} placeholder={ui("Laptop kerja / agent proyek")}/></label><label className={panelStyles.field}>{ui("Masa berlaku")}<select value={tokenDays} onChange={event => setTokenDays(Number(event.target.value) as 7 | 30 | 90)}><option value="7">{ui("7 hari")}</option><option value="30">{ui("30 hari")}</option><option value="90">{ui("90 hari")}</option></select></label><label className={panelStyles.field}>{ui("Izin")}<select value={tokenAccess} onChange={event => setTokenAccess(event.target.value as "read" | "write")}><option value="read">{ui("Baca saja")}</option><option value="write">{ui("Baca &amp; tulis tugas")}</option></select></label><label className={panelStyles.field}>{ui("Batas proyek")}<select value={tokenProject} onChange={event => setTokenProject(event.target.value)} disabled={plansLoading || plansError}><option value="">{ui("Semua proyek milik akun")}</option>{plans.filter(plan => plan.id !== "demo").map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label></div></form>
          <div className={accountStyles.tokenOverview}><div><Terminal size={22}/><strong>{tokensLoading || tokensError ? "…" : tokens.filter((token) => !token.revoked && (!token.expiresAt || Date.parse(token.expiresAt) > Date.now())).length}</strong><span>{ui("Token aktif")}</span></div><p>{ui("Token baru hanya ditampilkan satu kali. Simpan dengan aman sebelum Anda menutup halaman ini. Token lama tidak bisa ditampilkan kembali.")}</p></div>
          {newToken && <div className={accountStyles.newToken} role="status"><div><strong>{ui("Token baru siap digunakan")}</strong><p>{ui("Salin sekarang. Nilai ini tidak akan ditampilkan lagi setelah halaman ditutup.")}</p></div><code>{newToken}</code><button type="button" onClick={() => handleCopy(newToken, "new-token")}>{copiedToken === "new-token" ? <Check size={16}/> : <Copy size={16}/>} {copiedToken === "new-token" ? ui("Tersalin") : ui("Salin token")}</button></div>}
          <div className={accountStyles.tokenListHeading}><h2>{ui("Daftar token")}</h2><span>{tokensLoading || tokensError ? "…" : `${visibleTokens.length} / ${tokens.length} token`}</span></div>
          <div className={panelStyles.row}><div className={accountStyles.segmented} role="group" aria-label={ui("Status token")}>{(["active", "revoked", "expired"] as const).map(group => <button type="button" key={group} aria-pressed={tokenGroup === group} onClick={() => setTokenGroup(group)}>{ui(group === "active" ? "Aktif" : group === "revoked" ? "Dicabut" : "Kedaluwarsa")}</button>)}</div><select aria-label={ui("Periode token")} value={tokenRecent ? "recent" : "all"} onChange={event => setTokenRecent(event.target.value === "recent")}><option value="recent">{ui("3 hari terakhir")}</option><option value="all">{ui("Semua waktu")}</option></select></div>
          <p className={accountStyles.intro}>{ui("Aktif: dibuat atau dipakai dalam periode ini. Revoked: tanggal pencabutan. Kedaluwarsa: tanggal berakhir. Filter tidak menghapus token.")}</p>
          {tokensLoading ? <div className={accountStyles.tokenEmpty} role="status"><Loader2 size={25} className="animate-spin"/><strong>{ui("Memuat token…")}</strong></div> : tokensError ? <div className={accountStyles.tokenEmpty} role="alert"><Terminal size={25}/><strong>{ui("Token belum bisa dimuat")}</strong><p>{ui("Periksa koneksi lalu coba lagi.")}</p><button type="button" onClick={() => window.location.reload()}>{ui("Coba lagi")}</button></div> : visibleTokens.length === 0 ? <div className={accountStyles.tokenEmpty}><Terminal size={25}/><strong>{ui("Tidak ada token dalam filter ini")}</strong><p>{ui("Pilih Semua waktu untuk mengelola token lama.")}</p></div> : <div className={accountStyles.tokenList}>{visibleTokens.map((token) => <div className={accountStyles.tokenRow} key={token.hash}><div className={accountStyles.tokenIcon}><Terminal size={19}/></div><div className={accountStyles.tokenIdentity}><div><strong>{token.label}</strong><span className={token.revoked ? accountStyles.tokenRevoked : accountStyles.tokenActive}>{token.revoked ? ui("Dicabut") : token.expiresAt && Date.parse(token.expiresAt) <= Date.now() ? ui("Kedaluwarsa") : ui("Aktif")}</span></div><p>ID {token.hash.slice(0, 12)}… · {token.createdAt && !Number.isNaN(Date.parse(token.createdAt)) ? new Date(token.createdAt).toLocaleDateString(uiLocale()) : ui("Tanggal tidak tersedia")}</p><p>{token.access === "read" ? ui("Baca saja") : ui("Baca & tulis")} · {token.projectIds?.length ? ui("{0} proyek", token.projectIds.length) : ui("Semua proyek")}</p><p>{ui("Berlaku")}{token.expiresAt ? new Date(token.expiresAt).toLocaleDateString(uiLocale(), { timeZone: preferences.timezone }) : ui("tanpa batas (token lama)")} · {ui("Dipakai")} {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString(uiLocale(), { timeZone: preferences.timezone }) : ui("belum pernah")}</p></div>{!token.revoked && <button type="button" onClick={() => setTokenToRevoke(token)} aria-label={ui("Cabut token {0}", token.label)}><Trash2 size={16}/>{ui("Cabut")}</button>}</div>)}</div>}
        </section>}
        {activeTab === "security" && <section className={accountStyles.security} aria-labelledby="security-title">
          <p className={accountStyles.eyebrow}>{ui("PENGATURAN / KEAMANAN")}</p>
          <h1 id="security-title">{ui("Keamanan akun")}</h1>
          <p className={accountStyles.intro}>{ui("Kelola kata sandi dan akses CLI dari satu tempat.")}</p>
          <div className={accountStyles.securityGrid}>
            <div className={accountStyles.passwordPanel}>
              <div className={accountStyles.panelHeading}><span><Shield size={20}/></span><div><h2>{ui("Ubah kata sandi")}</h2><p>{ui("Gunakan kata sandi baru yang tidak dipakai di layanan lain.")}</p></div></div>
              <div className={accountStyles.passwordFields}>
                <div><label htmlFor="current-password">{ui("Kata sandi saat ini")}</label><div className={accountStyles.passwordInput}><input id="current-password" autoComplete="current-password" type={showOldPass ? "text" : "password"} value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder={ui("Masukkan kata sandi saat ini")}/><button type="button" aria-label={showOldPass ? ui("Sembunyikan kata sandi saat ini") : ui("Tampilkan kata sandi saat ini")} onClick={() => setShowOldPass(!showOldPass)}>{showOldPass ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
                <div><label htmlFor="new-password">{ui("Kata sandi baru")}</label><div className={accountStyles.passwordInput}><input id="new-password" autoComplete="new-password" type={showNewPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder={ui("Minimal 6 karakter")}/><button type="button" aria-label={showNewPass ? ui("Sembunyikan kata sandi baru") : ui("Tampilkan kata sandi baru")} onClick={() => setShowNewPass(!showNewPass)}>{showNewPass ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
                <div><label htmlFor="confirm-password">{ui("Ulangi kata sandi baru")}</label><div className={accountStyles.passwordInput}><input id="confirm-password" autoComplete="new-password" type={showConfirmPass ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder={ui("Ulangi kata sandi baru")}/><button type="button" aria-label={showConfirmPass ? ui("Sembunyikan konfirmasi kata sandi") : ui("Tampilkan konfirmasi kata sandi")} onClick={() => setShowConfirmPass(!showConfirmPass)}>{showConfirmPass ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
              </div>
              {passMsg && <p className={passMsgType === "success" ? accountStyles.successMessage : accountStyles.errorMessage} role={passMsgType === "error" ? "alert" : "status"}>{ui(passMsg)}</p>}
              <div className={accountStyles.securityFooter}><span>{ui("Kata sandi baru minimal 6 karakter.")}</span><button type="button" onClick={handleChangePass} disabled={passLoading}>{passLoading ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>} {passLoading ? ui("Menyimpan…") : ui("Simpan kata sandi")}</button></div>
            </div>
            <aside className={accountStyles.accessPanel}>
              <div className={accountStyles.panelHeading}><span><Terminal size={20}/></span><div><h2>{ui("Akses developer")}</h2><p>{ui("Token untuk agent dan perangkat CLI.")}</p></div></div>
              <div className={accountStyles.accessStat}><span>{ui("Token aktif")}</span><strong>{tokensLoading || tokensError ? "…" : tokens.filter((token) => !token.revoked && (!token.expiresAt || Date.parse(token.expiresAt) > Date.now())).length}</strong></div>
              <p>{ui("Cabut token yang sudah tidak digunakan. Nilai token hanya ditampilkan ketika baru dibuat.")}</p>
              <button type="button" onClick={() => navigateTab("tokens")}>{ui("Kelola token CLI")}<ArrowLeft size={16}/></button>
              <div className={accountStyles.accessDivider}/>
              <h3>{ui("Identitas akun")}</h3>
              <dl><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>{ui("Paket")}</dt><dd>{accountPlanLabel}</dd></div></dl>
            </aside>
          </div>
          <AccountSessions email={user.email} preview={previewMode()} timezone={preferences.timezone}/>
        </section>}
        {activeTab === "billing" && <section className={accountStyles.billing}>
          <p className={accountStyles.eyebrow}>{ui("AKUN / BILLING")}</p>
          <h1>{ui("Billing &amp; Pemakaian")}</h1>
          <p className={accountStyles.intro}>{ui("Lihat paket dan sisa kuota generate akun Anda.")}</p>
          <div className={accountStyles.billingPanel}>
            <div><span className={accountStyles.muted}>{ui("Paket saat ini")}</span><h2>{accountPlanLabel}</h2><AccountBadges account={user} reducedMotion={preferences.motion === "reduced"}/><p>{membershipTier ? isPro ? ui("Akses paket Pro aktif di akun ini.") : ui("Paket Free aktif di akun ini.") : ui("Status paket belum bisa diverifikasi.")}</p></div>
            <div><span className={accountStyles.muted}>{ui("Generate tersedia")}</span><strong>{quotaLoading || quotaError ? "…" : quota?.unlimited ? ui("Tanpa batas") : quota ? Math.max(0, quota.remaining) + " / " + quota.limit : ui("Belum ada data")}</strong><p>{quotaLoading ? ui("Memuat pemakaian…") : quotaError ? ui("Pemakaian belum bisa dimuat.") : quota?.resetAt && !Number.isNaN(Date.parse(quota.resetAt)) ? "Reset " + new Date(quota.resetAt).toLocaleDateString(uiLocale()) : quota ? isAdmin && !isPro && quota.unlimited ? ui("Akses admin bebas kuota generate harian.") : ui("Mengikuti periode pemakaian akun.") : ui("Data pemakaian belum tersedia.")}</p></div>
          </div>
          {quota && !quota.unlimited && <div className={accountStyles.usageTrack} role="progressbar" aria-label={ui("Sisa kuota generate")} aria-valuenow={Math.max(0, quota.remaining)} aria-valuemax={Math.max(1, quota.limit)} aria-valuemin={0}><span style={{width: `${Math.min(100, Math.max(0, quota.remaining / Math.max(1, quota.limit) * 100))}%`}}/></div>}
          {quotaError && <button className={accountStyles.retry} type="button" onClick={() => window.location.reload()}>{ui("Coba muat ulang pemakaian")}</button>}
          {user.proExpiresAt && <p className={accountStyles.intro}>{ui("Masa aktif Pro berakhir {0}.", new Date(user.proExpiresAt).toLocaleDateString(uiLocale(), { timeZone: preferences.timezone }))}</p>}
          <UsageHistory email={user.email} preview={previewMode()} timezone={preferences.timezone}/>
          <div className={accountStyles.billingActions}><Link href="/pricing">{ui("Lihat pilihan paket")}<ArrowLeft size={15}/></Link><p>{ui("Pilihan paket dibuka hanya saat Anda ingin membandingkan atau mengganti paket.")}</p></div>
        </section>}
        {activeTab === "preferences" && <section className={accountStyles.preferences} aria-labelledby="preferences-title">
          <p className={accountStyles.eyebrow}>{ui("PENGATURAN / PREFERENSI")}</p>
          <h1 id="preferences-title">{ui("Tampilan")}</h1>
          <fieldset className={panelStyles.panel}><legend>{ui("Gaya warna")}</legend><p className={panelStyles.hint}>{ui("Satu warna aksen untuk seluruh antarmuka. Scratch Green adalah identitas default.")}</p><div className="account-color-choices">{([{ value: "scratch", label: "Scratch Green", color: "#74fa6a" }, { value: "blue", label: "Blue", color: "#87bfff" }, { value: "violet", label: "Violet", color: "#c4a5ff" }, { value: "amber", label: "Amber", color: "#f2c66d" }, { value: "rose", label: "Rose", color: "#f4a5b8" }] as const).map(option => <button type="button" key={option.value} aria-pressed={preferences.colorStyle === option.value} disabled={accountSettings.loading || !!accountSettings.error || preferencesSaving} onClick={() => { setPreferences({ ...preferences, colorStyle: option.value }); setPreferencesSaved(false); document.documentElement.dataset.colorStyle = option.value; }}><i style={{ background: option.color }}/>{option.label}{preferences.colorStyle === option.value && <Check size={15}/>}</button>)}</div></fieldset>
          <p className={accountStyles.intro}>{ui("Atur tampilan, bahasa produk, dan zona waktu. Pengaturan disimpan di akun dan ikut ke perangkat Anda.")}</p>
          {accountSettings.error && <div role="alert" className={accountStyles.errorMessage}>{accountSettings.error} <button onClick={accountSettings.reload}>{ui("Coba lagi")}</button></div>}
          <div className={accountStyles.preferenceGroup}>
            <div className={accountStyles.preferenceRow}><div><h2>{ui("Kepadatan daftar")}</h2><p>{ui("Pilih jarak antarproyek yang nyaman dibaca.")}</p></div><div className={accountStyles.segmented} role="group" aria-label={ui("Kepadatan daftar proyek")}><button type="button" aria-pressed={preferences.density === "comfortable"} onClick={() => { setPreferences({ ...preferences, density: "comfortable" }); setPreferencesSaved(false); }}>{ui("Nyaman")}</button><button type="button" aria-pressed={preferences.density === "compact"} onClick={() => { setPreferences({ ...preferences, density: "compact" }); setPreferencesSaved(false); }}>{ui("Compact")}</button></div></div>
            <div className={accountStyles.preferenceRow}><div><h2>{ui("Gerakan antarmuka")}</h2><p>{ui("Kurangi transisi dan animasi pada halaman akun.")}</p></div><div className={accountStyles.segmented} role="group" aria-label={ui("Animasi antarmuka")}><button type="button" aria-pressed={preferences.motion === "system"} onClick={() => { setPreferences({ ...preferences, motion: "system" }); setPreferencesSaved(false); }}>{ui("Ikuti sistem")}</button><button type="button" aria-pressed={preferences.motion === "reduced"} onClick={() => { setPreferences({ ...preferences, motion: "reduced" }); setPreferencesSaved(false); }}>{ui("Kurangi")}</button></div></div>
            <div className={accountStyles.preferenceRow}><div><h2>{ui("Animasi badge")}</h2><p>{ui("Ikon Free, Pro, dan Admin bergerak singkat saat muncul atau disentuh. Aktif mengizinkan animasi saat sistem mengurangi gerakan. Mode Kurangi tetap menghentikannya.")}</p></div><div className={accountStyles.segmented} role="group" aria-label={ui("Animasi badge akun")}>{(["system", "animated", "reduced"] as const).map(mode => <button key={mode} type="button" aria-pressed={preferences.badgeMotion === mode} onClick={() => { setPreferences({ ...preferences, badgeMotion: mode }); setPreferencesSaved(false); }}>{mode === "system" ? ui("Ikuti sistem") : mode === "animated" ? ui("Aktif") : ui("Diam")}</button>)}</div></div>
            <div className={accountStyles.preferenceRow}><div><h2>{ui("Filter proyek saat dibuka")}</h2><p>{ui("Filter awal saat Anda masuk ke daftar proyek.")}</p></div><select aria-label={ui("Filter proyek saat dibuka")} value={preferences.defaultFilter} onChange={(event) => { setPreferences({ ...preferences, defaultFilter: event.target.value as AccountPreferences["defaultFilter"] }); setPreferencesSaved(false); }}><option value="all">{ui("Semua proyek")}</option><option value="active">{ui("Dikerjakan")}</option><option value="done">{ui("Selesai")}</option></select></div>
          </div>
          <div className={panelStyles.panel}><div className={panelStyles.row}><div><h2><label htmlFor="account-timezone">{ui("Zona waktu")}</label></h2><p>{ui("Dipakai pada waktu aktivitas, sesi, pemakaian, dan proyek.")}</p></div><select id="account-timezone" value={preferences.timezone} onChange={event => setPreferences({ ...preferences, timezone: event.target.value })}>{["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Bangkok", "Asia/Singapore", "UTC", "Europe/London", "America/New_York"].map(zone => <option key={zone}>{zone}</option>)}</select></div><div className={panelStyles.row}><div><h2><label htmlFor="account-text-size">{ui("Ukuran teks formulir")}</label></h2><p>{ui("Perbesar teks pada pengaturan dan panel akun baru.")}</p></div><select id="account-text-size" value={preferences.textSize} onChange={event => setPreferences({ ...preferences, textSize: event.target.value as "standard" | "large" })}><option value="standard">{ui("Standar")}</option><option value="large">{ui("Besar")}</option></select></div></div>
          <div className={accountStyles.preferenceFooter}><span role={preferencesError ? "alert" : "status"}>{preferencesError || (preferencesSaved ? ui("Pengaturan tersimpan di akun.") : preferencesDirty ? ui("Perubahan belum disimpan.") : ui("Tidak ada perubahan."))}</span><button type="button" onClick={savePreferences} disabled={!preferencesDirty || preferencesSaving || accountSettings.loading || !!accountSettings.error}>{preferencesSaving ? ui("Menyimpan…") : ui("Simpan pengaturan")}</button></div>
          <div className={accountStyles.preferenceLinks}><h2>{ui("Akses &amp; keamanan")}</h2><button type="button" onClick={() => navigateTab("security")}><Shield size={17}/>{ui("Kata sandi &amp; keamanan")}<ArrowLeft size={15}/></button><button type="button" onClick={() => navigateTab("tokens")}><Terminal size={17}/>{ui("Token CLI &amp; API")}<ArrowLeft size={15}/></button></div>
        </section>}


            </main>
          </div>
        </div>

        {/* Modal Hapus */}
        {tokenToRevoke && <div className={accountStyles.modalBackdrop} role="presentation"><div className={accountStyles.modal} role="dialog" aria-modal="true" aria-labelledby="revoke-token-title" onKeyDown={(event) => { if (event.key === "Escape") setTokenToRevoke(null); if (event.key === "Tab") { const buttons = event.currentTarget.querySelectorAll("button"); if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); } } }}><h2 id="revoke-token-title">{ui("Cabut token?")}</h2><p>Token “{tokenToRevoke.label}{ui("” akan berhenti memberi akses CLI. Tindakan ini tidak dapat dibatalkan.")}</p><div><button type="button" autoFocus onClick={() => setTokenToRevoke(null)}>{ui("Batal")}</button><button type="button" onClick={() => revokeToken(tokenToRevoke.hash)}>{ui("Cabut token")}</button></div></div></div>}
        {planToDelete && (
          <div className={accountStyles.modalBackdrop} role="presentation">
            <div className={accountStyles.modal} role="dialog" aria-modal="true" aria-labelledby="delete-project-title" onKeyDown={(event) => { if (event.key === "Escape") setPlanToDelete(null); if (event.key === "Tab") { const buttons = event.currentTarget.querySelectorAll("button"); if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); } } }}>
              <h2 id="delete-project-title"><AlertTriangle size={18}/>{ui("Hapus proyek?")}</h2>
              <p>Proyek “{planToDelete.title}” akan dihapus permanen.</p>
              <div><button type="button" autoFocus onClick={() => setPlanToDelete(null)}>{ui("Batal")}</button><button type="button" onClick={confirmDeletePlan} disabled={deletingId !== null}>{deletingId ? ui("Menghapus…") : ui("Hapus proyek")}</button></div>
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
