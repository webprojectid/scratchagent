"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AccountBadges } from "@/components/account-badges";
import { User, Settings, LogOut, BookOpen } from "lucide-react";
import { accountMenuLinks } from "@/lib/account-navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser, refreshCurrentUser, supabaseConfigured, type CurrentUser } from "@/lib/current-user";

export function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;
    const sync = () => {
      refreshCurrentUser();
      getCurrentUser().then((u) => {
        if (active) setUser(u);
      });
    };
    sync();

    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("scratch_user");
    refreshCurrentUser();
    if (supabaseConfigured()) {
      createClient()
        .auth.signOut()
        .catch(() => {})
        .finally(() => {
          setUser(null);
          router.push("/login");
        });
    } else {
      setUser(null);
      router.push("/login");
    }
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="font-mono text-[12px] tracking-[0.02em] text-white/80 transition-colors hover:text-[#74FA6A]"
      >
        Masuk
      </Link>
    );
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const menuIcons = { profile: User, settings: Settings, docs: BookOpen };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu Akun"
          className="group relative flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/[.06] text-white/80 transition hover:border-[#74FA6A]/50 hover:bg-[#74FA6A]/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5ef7d]"
        >
          {initials ? (
            <span className="font-mono text-[11px] font-bold text-[#74FA6A]">{initials}</span>
          ) : (
            <User size={15} />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-[#1D2223] bg-[#74FA6A]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#121517] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="border-b border-white/[.08] px-2.5 py-2">
            <p className="truncate text-[12.5px] font-semibold text-white">{user.name}</p>
            <div className="my-2"><AccountBadges account={user}/></div>
            <p className="truncate font-mono text-[10.5px] text-white/40">{user.email}</p>
          </div>

          <div className="py-1">
            {accountMenuLinks.map(({ label, href, icon }) => {
              const Icon = menuIcons[icon];
              return <DropdownMenu.Item key={href} asChild>
                <Link href={href} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-white/80 outline-none transition data-[highlighted]:bg-white/[.07] data-[highlighted]:text-[#74FA6A]">
                  <Icon size={14} className="text-white/50"/><span>{label}</span>
                </Link>
              </DropdownMenu.Item>;
            })}
          </div>
          <DropdownMenu.Separator className="h-px bg-white/[.08]" />

          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-red-400 outline-none transition data-[highlighted]:bg-red-500/10"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
