"use client";

// Dashboard untuk EfferdDashboard2 — dibangun ulang mengikuti pola komponen
// Efferd (referensi asli tidak disertakan dalam snippet).
// Isi: header + stat cards, chart area pendapatan (recharts), donut kanal,
// tabel pesanan terbaru dengan avatar, memakai Separator + DropdownMenu.

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Download,
  DollarSign,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const REVENUE = [
  { month: "Jan", value: 24 },
  { month: "Feb", value: 31 },
  { month: "Mar", value: 28 },
  { month: "Apr", value: 38 },
  { month: "May", value: 36 },
  { month: "Jun", value: 47 },
  { month: "Jul", value: 52 },
  { month: "Aug", value: 58 },
];

const CHANNELS = [
  { name: "Direct", value: 42, color: "var(--theme-accent)" },
  { name: "Marketplace", value: 28, color: "var(--theme-chart-2)" },
  { name: "Social", value: 18, color: "var(--theme-chart-3)" },
  { name: "Other", value: 12, color: "var(--theme-border)" },
];

const STATS = [
  { label: "Revenue", value: "$58,240", delta: "+12.4%", up: true, icon: DollarSign },
  { label: "Orders", value: "1,842", delta: "+8.1%", up: true, icon: ShoppingCart },
  { label: "Customers", value: "3,109", delta: "+4.6%", up: true, icon: Users },
  { label: "Avg. Order", value: "$31.60", delta: "-1.2%", up: false, icon: CreditCard },
];

const ORDERS = [
  { id: "#3210", customer: "Maya Chen", initials: "MC", photo: "photo-1494790108377-be9c29b29330", product: "Nebula Headset", amount: "$129.00", status: "Paid" },
  { id: "#3209", customer: "Rizky Pratama", initials: "RP", photo: "photo-1507003211169-0a1dd7228f2d", product: "Orbit Mouse", amount: "$59.00", status: "Pending" },
  { id: "#3208", customer: "Sofia Marin", initials: "SM", photo: "photo-1438761681033-6461ffad8d80", product: "Flux Keyboard", amount: "$96.00", status: "Paid" },
  { id: "#3207", customer: "Kenji Sato", initials: "KS", photo: "photo-1500648767791-00dcc994a43e", product: "Pulse Speaker", amount: "$74.00", status: "Refunded" },
];

const STATUS_STYLE: Record<string, string> = {
  Paid: "bg-primary/12 text-primary",
  Pending: "bg-primary/12 text-primary",
  Refunded: "bg-red-400/12 text-red-300",
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number | string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] text-foreground shadow-lg shadow-black/40">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-primary">${payload[0]?.value}k</p>
    </div>
  );
}

export function Dashboard() {
  return (
    <div className="mx-auto max-w-[1040px] px-5 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Overview</p>
          <h1 className="mt-1.5 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-.03em] text-foreground">
            Good morning, Alex
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Here is what happened with your store today.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-foreground/[.04] px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[.08]"
        >
          <Download size={14} aria-hidden="true" />
          Export report
        </button>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-foreground/[.025] p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[12px] font-medium">{stat.label}</span>
              <stat.icon size={15} strokeWidth={2} aria-hidden="true" />
            </div>
            <p className="mt-2.5 text-[22px] font-semibold tracking-[-.02em] text-foreground">{stat.value}</p>
            <p className={`mt-1 inline-flex items-center gap-1 font-mono text-[11px] ${stat.up ? "text-primary" : "text-red-400"}`}>
              {stat.up ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
              {stat.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.65fr_1fr]">
        <div className="rounded-xl border border-border bg-foreground/[.025] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">Revenue</h2>
            <span className="font-mono text-[11px] text-muted-foreground">last 8 months</span>
          </div>
          <div className="mt-3 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "var(--theme-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--theme-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "color-mix(in srgb, var(--theme-text) 13.3%, transparent)" }} />
                <Area type="monotone" dataKey="value" stroke="var(--theme-accent)" strokeWidth={2} fill="url(#rev-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-foreground/[.025] p-4">
          <h2 className="text-[14px] font-semibold text-foreground">Sales channels</h2>
          <div className="relative mt-1 h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CHANNELS} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={3} strokeWidth={0}>
                  {CHANNELS.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="block text-[18px] font-semibold text-foreground">2,847</span>
              <span className="block font-mono text-[10px] text-muted-foreground">orders</span>
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {CHANNELS.map((channel) => (
              <li key={channel.name} className="flex items-center gap-2 text-[12px] text-foreground">
                <span className="size-2 rounded-full" style={{ background: channel.color }} aria-hidden="true" />
                <span className="flex-1">{channel.name}</span>
                <span className="font-mono text-muted-foreground">{channel.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Orders table */}
      <div className="mt-4 rounded-xl border border-border bg-foreground/[.025]">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Package size={15} strokeWidth={2} aria-hidden="true" className="text-muted-foreground" />
            Recent orders
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">4 of 128</span>
        </div>
        <Separator.Root className="mt-3 h-px bg-foreground/[.07]" />
        <table className="w-full text-left">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Customer</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Product</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-2 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((order) => (
              <tr key={order.id} className="border-t border-border transition-colors hover:bg-foreground/[.03]">
                <td className="px-4 py-3 font-mono text-[12px] text-foreground">{order.id}</td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="flex items-center gap-2.5">
                    <Avatar.Root className="size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                      <Avatar.Image
                        src={`https://images.unsplash.com/${order.photo}?w=56&h=56&fit=crop&q=80&auto=format`}
                        alt={order.customer}
                        loading="lazy"
                      />
                      <Avatar.Fallback className="bg-foreground/10 font-mono text-[9px] text-foreground">{order.initials}</Avatar.Fallback>
                    </Avatar.Root>
                    <span className="text-[13px] text-foreground">{order.customer}</span>
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-[13px] text-foreground md:table-cell">{order.product}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-foreground">{order.amount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${STATUS_STYLE[order.status]}`}>{order.status}</span>
                </td>
                <td className="px-2 py-3">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for order ${order.id}`}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[.06] hover:text-foreground"
                      >
                        <MoreHorizontal size={15} aria-hidden="true" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        className="z-50 min-w-[140px] rounded-lg border border-border bg-card p-1 shadow-xl shadow-black/50"
                      >
                        {["View details", "Refund", "Copy link"].map((action) => (
                          <DropdownMenu.Item
                            key={action}
                            className="cursor-pointer rounded-md px-2.5 py-2 text-[12px] text-foreground outline-none transition-colors data-[highlighted]:bg-foreground/[.07] data-[highlighted]:text-foreground"
                          >
                            {action}
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
