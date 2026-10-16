"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Cpu, Shield, Users } from "lucide-react";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
import { Shell } from "./brand";
import s from "./account-workbench.module.css";

const Llm = dynamic(() => import("./developer-llm").then(module => module.DeveloperLlm), { loading: () => <p role="status">Loading…</p> });
const UserManagement = dynamic(() => import("@/app/admin/users/users-client"), { loading: () => <p role="status">Loading…</p> });
const Security = dynamic(() => import("@/app/admin/security/security-client"), { loading: () => <p role="status">Loading…</p> });
type Tab = "llm" | "users" | "security";

export function DeveloperWorkspace({ email, initialTab }: { email: string; initialTab: Tab }) {
  useUiLanguage();
  const [tab, setTab] = useState(initialTab);
  const [llmOpened, setLlmOpened] = useState(initialTab === "llm");
  const tabs = [{ id: "llm" as const, title: "LLM Engine", icon: Cpu }, { id: "users" as const, title: ui("Pengguna"), icon: Users }, { id: "security" as const, title: ui("Keamanan"), icon: Shield }];
  function select(next: Tab) {
    setTab(next);
    if (next === "llm") setLlmOpened(true);
    window.history.replaceState(null, "", "/developer-settings?tab=" + next);
  }
  return <Shell sidebar={false} back="/settings"><div className={s.page}><div className={s.frame}>
    <nav className={s.nav} aria-label="Developer Setting">
      <p>ADMIN</p>
      {tabs.map(({ id, title, icon: Icon }) => <button key={id} type="button" onClick={() => select(id)} aria-current={tab === id ? "page" : undefined} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-white/70 hover:bg-white/5 aria-[current=page]:bg-[#a5ef7d]/10 aria-[current=page]:text-[#a5ef7d]"><Icon size={16}/>{title}</button>)}
      <Link href="/profile">{ui("Profil")}</Link>
      <Link href="/settings">{ui("Pengaturan")}</Link>
    </nav>
    <div className={s.content}>
      <header className={s.header}><p>SCRATCHAGENT / ADMIN</p><h1>Developer Setting</h1><div>{ui("Manage AI providers, user access, and security activity.")}</div></header>
      <div className={s.body}>
        {llmOpened && <div hidden={tab !== "llm"}><Llm email={email}/></div>}
        {tab === "users" && <UserManagement embedded/>}
        {tab === "security" && <Security embedded/>}
      </div>
    </div>
  </div></div></Shell>;
}
