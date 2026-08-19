"use client";

import { useState } from "react";
import { LineChart, BarChart, Users, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ─── Main Analytics Dashboard ──────────────────────────────────────────────────

export function ScratchDashboard2() {
  const [selectedPeriod] = useState("7d");

  return (
    <div className="flex h-full flex-col bg-[#0f1117] text-slate-100">
      {/* top nav */}
      <header className="flex h-[56px] items-center justify-between border-b border-white/[.06] px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#7c3aed]" aria-hidden="true">
            <span className="text-[14px] font-bold text-white">S</span>
          </span>
          <span className="text-[14px] font-semibold tracking-tight">Scratch Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-white/[.08] bg-white/[.03] px-2 py-1 text-[10px] text-slate-300 outline-none hover:border-white/[.15]">
            <option>7 days</option>
            <option>30 days</option>
            <option>90 days</option>
          </select>
          <button className="rounded-md p-1 text-slate-400 hover:bg-white/[.06] hover:text-white">
            <Users size={15} />
          </button>
        </div>
      </header>

      {/* main content */}
      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        
        {/* header + KPI cards */}
        <div className="mb-4 space-y-3">
          <h1 className="text-[20px] font-medium leading-tight text-slate-100">Good morning, Dedi Kurniawan</h1>
          
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Revenue</span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-400">+12%</span>
              </div>
              <div className="text-[16px] font-semibold text-slate-100">$42,391</div>
              <div className="mt-1 h-10 rounded bg-gradient-to-b from-emerald-500/20 to-transparent">
                <svg viewBox="0 0 100 40" className="h-full w-full opacity-60">
                  <path d="M0 30 Q20 25 40 28 T80 15 T100 5" fill="none" stroke="#34d399" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Users</span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-400">+8%</span>
              </div>
              <div className="text-[16px] font-semibold text-slate-100">12,847</div>
              <div className="mt-1 h-10 rounded bg-gradient-to-b from-blue-500/20 to-transparent">
                <svg viewBox="0 0 100 40" className="h-full w-full opacity-60">
                  <path d="M0 35 Q25 30 50 20 T100 8" fill="none" stroke="#60a5fa" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Conversion</span>
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[7px] font-semibold text-rose-400">-3%</span>
              </div>
              <div className="text-[16px] font-semibold text-slate-100">3.84%</div>
              <div className="mt-1 h-10 rounded bg-gradient-to-b from-purple-500/20 to-transparent">
                <svg viewBox="0 0 100 40" className="h-full w-full opacity-60">
                  <path d="M0 20 Q25 25 50 18 T100 12" fill="none" stroke="#a78bfa" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Churn Rate</span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-400">-2%</span>
              </div>
              <div className="text-[16px] font-semibold text-slate-100">2.1%</div>
              <div className="mt-1 h-10 rounded bg-gradient-to-b from-orange-500/20 to-transparent">
                <svg viewBox="0 0 100 40" className="h-full w-full opacity-60">
                  <path d="M0 10 Q25 15 50 22 T100 30" fill="none" stroke="#fb923c" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* charts section */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Revenue chart */}
          <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Revenue · 12 months</span>
              <span className="rounded bg-violet-500/15 px-2 py-0.5 text-[8px] font-semibold text-violet-300">Live</span>
            </div>
            <div className="h-28 rounded-lg bg-gradient-to-b from-violet-500/10 to-transparent">
              <svg viewBox="0 0 400 100" className="h-full w-full">
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 80 L0 65 Q30 55 60 60 T120 45 T180 50 T240 30 T300 35 T360 20 L400 15 L400 100 L0 100 Z" fill="url(#grad)" />
                <path d="M0 65 Q30 55 60 60 T120 45 T180 50 T240 30 T300 35 T360 20 L400 15" fill="none" stroke="#a78bfa" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* User activity chart */}
          <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Weekly active users</span>
              <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[8px] font-semibold text-blue-300">Active</span>
            </div>
            <div className="flex h-28 items-end justify-between gap-1.5">
              {[35, 45, 40, 55, 65, 75, 60].map((h, i) => (
                <div key={i} className="w-full rounded-t bg-blue-500/20 hover:bg-blue-500/40 transition-colors" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* bottom: transactions + channels */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Recent transactions */}
          <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Recent transactions</span>
              <button className="text-[9px] text-violet-400 hover:text-violet-300">View all</button>
            </div>
            <div className="space-y-2">
              {[
                { name: "Dedi Kurniawan", amount: "+$492.00", time: "2m ago", status: "success" },
                { name: "Sri Wahyuni", amount: "+$128.50", time: "15m ago", status: "pending" },
                { name: "Bambang Wicaksono", amount: "-$35.00", time: "1h ago", status: "failed" },
                { name: "Tika Pathmanathan", amount: "+$892.00", time: "2h ago", status: "success" },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-white/[.04] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <img src={`https://images.unsplash.com/photo-150${i+0}7003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face`} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white/[.08]" />
                    <div>
                      <div className="text-[10px] font-medium text-slate-200">{tx.name}</div>
                      <div className="text-[7px] text-slate-500">{tx.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-medium ${tx.amount.startsWith("+") ? "text-emerald-400" : tx.amount.startsWith("-") ? "text-rose-400" : "text-slate-300"}`}>
                      {tx.amount}
                    </div>
                    <div className="text-[7px] text-slate-500 capitalize">{tx.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top channels */}
          <div className="rounded-xl border border-white/[.06] bg-white/[.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Top channels</span>
              <button className="text-[9px] text-violet-400 hover:text-violet-300">Details</button>
            </div>
            <div className="space-y-2.5">
              {[
                { name: "Organic Search", pct: 42, color: "violet" },
                { name: "Direct", pct: 28, color: "blue" },
                { name: "Social Media", pct: 18, color: "emerald" },
                { name: "Referral", pct: 12, color: "amber" },
              ].map((ch, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-400">{ch.name}</span>
                    <span className="text-[9px] font-semibold text-slate-300">{ch.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[.06]">
                    <div 
                      className={`h-full rounded-full bg-${ch.color}-500`} 
                      style={{ width: `${ch.pct}%`, opacity: ch.pct === 42 ? 0.9 : ch.pct === 28 ? 0.7 : 0.5 }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default ScratchDashboard2;