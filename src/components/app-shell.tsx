"use client";

// AppShell untuk EfferdDashboard2 — dibangun ulang mengikuti pola komponen
// Efferd (referensi aslinya tidak disertakan dalam snippet; hanya wrapper).
// Keputusan:
// - Root `relative` + `h-full`: dipakai di dalam SafariFrame, jadi drawer
//   mobile memakai `absolute` (bukan `fixed`, yang akan keluar dari frame).
// - Sidebar: nav utama + dua grup collapsible (radix Collapsible) + user
//   menu (radix DropdownMenu + Avatar).
// - Konten utama scroll sendiri (`overflow-y-auto`), sidebar tetap.

import { useState, type ReactNode } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Folder,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const NAV_MAIN = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Analytics", icon: BarChart3, badge: undefined },
  { label: "Orders", icon: ShoppingCart, badge: "12" },
];

const NAV_PROJECTS = [
  { label: "Website Redesign", icon: Folder },
  { label: "Mobile App", icon: Folder },
  { label: "API Integration", icon: Folder },
];

const NAV_SETTINGS = [
  { label: "Preferences", icon: SlidersHorizontal },
  { label: "Help Center", icon: CircleHelp },
];

function NavItem({
  label,
  icon: Icon,
  active = false,
  badge,
  sub = false,
}: {
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
  badge?: string;
  sub?: boolean;
}) {
  return (
    <a
      href="#"
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
        sub ? "pl-9 text-white/50 hover:bg-white/[.05] hover:text-white" : ""
      } ${
        active
          ? "bg-white/[.08] text-white"
          : sub
            ? ""
            : "text-white/60 hover:bg-white/[.05] hover:text-white"
      }`}
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" className={active ? "text-[#74FA6A]" : ""} />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full bg-[#74FA6A]/15 px-2 py-0.5 font-mono text-[10px] text-[#74FA6A]">{badge}</span>
      ) : null}
    </a>
  );
}

function NavGroup({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[.05] hover:text-white"
        >
          {trigger}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="mt-0.5 space-y-0.5">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[.07] px-4">
        <span className="grid size-7 place-items-center rounded-md bg-[#74FA6A] font-mono text-[13px] font-bold text-black" aria-hidden="true">
          E
        </span>
        <span className="text-[15px] font-semibold tracking-[-.02em] text-white">Efferd</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[.16em] text-white/30">Overview</p>
        {NAV_MAIN.map((item) => (
          <NavItem key={item.label} label={item.label} icon={item.icon} active={item.active} badge={item.badge} />
        ))}

        <p className="px-3 pb-2 pt-5 font-mono text-[10px] uppercase tracking-[.16em] text-white/30">Workspace</p>
        <NavGroup
          trigger={
            <>
              <Folder size={15} strokeWidth={2} aria-hidden="true" />
              <span>Projects</span>
            </>
          }
        >
          {NAV_PROJECTS.map((item) => (
            <NavItem key={item.label} label={item.label} icon={item.icon} sub />
          ))}
        </NavGroup>

        <p className="px-3 pb-2 pt-5 font-mono text-[10px] uppercase tracking-[.16em] text-white/30">General</p>
        <NavGroup
          trigger={
            <>
              <Settings size={15} strokeWidth={2} aria-hidden="true" />
              <span>Settings</span>
            </>
          }
        >
          {NAV_SETTINGS.map((item) => (
            <NavItem key={item.label} label={item.label} icon={item.icon} sub />
          ))}
        </NavGroup>
      </nav>

      {/* User */}
      <div className="border-t border-white/[.07] p-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[.05]"
            >
              <Avatar.Root className="size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                <Avatar.Image
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&q=80&auto=format"
                  alt="Alex Rivera"
                />
                <Avatar.Fallback className="bg-white/10 font-mono text-[11px] text-white">AR</Avatar.Fallback>
              </Avatar.Root>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">Alex Rivera</span>
                <span className="block truncate text-[11px] text-white/40">alex@efferd.app</span>
              </span>
              <ChevronDown size={14} aria-hidden="true" className="text-white/40" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="top"
              sideOffset={6}
              className="z-50 min-w-[180px] rounded-lg border border-white/10 bg-[#17171B] p-1 shadow-xl shadow-black/50"
            >
              {[
                { label: "Profile", icon: User },
                { label: "Billing", icon: CreditCard },
              ].map((item) => (
                <DropdownMenu.Item
                  key={item.label}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-white/70 outline-none transition-colors data-[highlighted]:bg-white/[.07] data-[highlighted]:text-white"
                >
                  <item.icon size={14} aria-hidden="true" />
                  {item.label}
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator className="my-1 h-px bg-white/[.08]" />
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-red-400 outline-none transition-colors data-[highlighted]:bg-red-500/10">
                <LogOut size={14} aria-hidden="true" />
                Log out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex h-full min-h-[560px] w-full overflow-hidden bg-[#0A0A0B] font-sans text-white">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-white/[.07] bg-[#0E0E11] lg:block">
        <SidebarContent />
      </aside>

      {/* Drawer mobile (absolute agar tetap di dalam frame) */}
      {mobileOpen ? (
        <div className="absolute inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-white/[.07] bg-[#0E0E11]">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-white/50 transition-colors hover:text-white"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      ) : null}

      {/* Konten utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar tipis untuk toggle mobile */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[.07] px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/[.06] hover:text-white"
          >
            <PanelLeft size={17} aria-hidden="true" />
          </button>
          <span className="text-[14px] font-semibold">Efferd</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
