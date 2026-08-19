"use client";

import { useState } from "react";
import {
  Car, User, BarChart2, HelpCircle, LogOut, Heart,
  ChevronLeft, ChevronRight, Minus, Plus as PlusIcon, Phone, Mail,
} from "lucide-react";
import { SafariFrame } from "@/components/ui/safari-browser-frame";

// ─── Top Nav ─────────────────────────────────────────────────────────────────

function TopNav() {
  return (
    <nav className="flex h-[48px] shrink-0 items-center justify-between bg-white px-4 shadow-[0_1px_4px_rgba(0,0,0,.10)]">
      {/* Logo + links */}
      <div className="flex items-center gap-5">
        <div className="grid h-8 w-8 place-items-center rounded bg-[#1a56db]">
          <span className="text-[15px] font-bold text-white" style={{ fontFamily: "serif", fontStyle: "italic" }}>A</span>
        </div>
        {[
          { icon: <Car size={13} />, label: "Vehicles" },
          { icon: <User size={13} />, label: "Application" },
          { icon: <BarChart2 size={13} />, label: "Profile" },
        ].map(({ icon, label }) => (
          <button key={label} className="flex items-center gap-1.5 text-[11px] font-medium text-[#374151] hover:text-[#1a56db]">
            <span className="text-[#6b7280]">{icon}</span>{label}
          </button>
        ))}
      </div>
      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1.5 text-[11px] font-medium text-[#374151] hover:text-[#1a56db]">
          <HelpCircle size={13} className="text-[#6b7280]" />Help
        </button>
        <button className="flex items-center gap-1.5 text-[11px] font-medium text-[#374151] hover:text-[#1a56db]">
          <LogOut size={13} className="text-[#6b7280]" />Logout
        </button>
      </div>
    </nav>
  );
}

// ─── Car Images ───────────────────────────────────────────────────────────────

const IMAGES = [
  "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=500&fit=crop&q=80", // civic front
  "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop&q=80", // rear
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=500&fit=crop&q=80", // side
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop&q=80", // interior
];

// ─── Spec Row ─────────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f3f4f6] py-[7px]">
      <span className="text-[10px] text-[#6b7280]">{label}</span>
      <span className="text-[10px] font-medium text-[#111827]">{value}</span>
    </div>
  );
}

// ─── Finance Row ──────────────────────────────────────────────────────────────

function FinRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-[6px] ${bold ? "border-t border-[#e5e7eb] mt-1 pt-2" : "border-b border-[#f3f4f6]"}`}>
      <span className={`text-[10px] ${bold ? "font-semibold text-[#111827]" : "text-[#6b7280]"}`}>{label}</span>
      <span className={`text-[10px] ${bold ? "font-semibold text-[#111827]" : "text-[#111827]"}`}>{value}</span>
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="border-t border-[#e5e7eb]">
      <button onClick={onToggle} className="flex w-full items-center justify-between py-2.5 text-left">
        <span className="text-[11px] font-semibold text-[#374151]">{title}</span>
        <span className="grid h-5 w-5 place-items-center rounded border border-[#d1d5db] text-[#6b7280]">
          {open ? <Minus size={10} /> : <PlusIcon size={10} />}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function AutoFinanceDashboard() {
  const [activeImg, setActiveImg] = useState(0);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const prev = () => setActiveImg(i => (i - 1 + IMAGES.length) % IMAGES.length);
  const next = () => setActiveImg(i => (i + 1) % IMAGES.length);

  return (
    <div className="flex h-full min-h-[620px] w-full flex-col overflow-hidden" style={{ background: "linear-gradient(160deg,#1e3a5f 0%,#0f2340 60%,#071528 100%)" }}>
      <TopNav />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden">

        {/* Vehicle header card */}
        <div className="rounded-lg bg-white px-5 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            {/* Left — name */}
            <div className="min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6b7280]">Used</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[18px] font-bold leading-tight text-[#111827]">2023 Honda Civic</span>
                <Heart size={14} className="text-[#1a56db]" fill="#1a56db" />
              </div>
              <p className="text-[13px] font-semibold text-[#374151]">Si</p>
            </div>
            {/* Center specs */}
            <div className="flex gap-5">
              {[
                ["Mileage", "10,000"],
                ["Transmission", "Manual"],
                ["MPG", "31 city | 38 hwy"],
                ["Fuel", "Gas"],
              ].map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-[8px] text-[#9ca3af]">{k}</p>
                  <p className="text-[10px] font-semibold text-[#111827]">{v}</p>
                </div>
              ))}
            </div>
            {/* Right — price + CTA */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div>
                <p className="text-[9px] text-[#6b7280]">Your payment</p>
                <p className="text-[18px] font-bold text-[#111827]">$517.88 <span className="text-[10px] font-normal text-[#6b7280]">/Mo.</span></p>
              </div>
              <button className="rounded bg-[#1a56db] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1648c0]">Select</button>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="mt-3 grid grid-cols-[1fr_300px] gap-3">

          {/* LEFT column */}
          <div className="flex flex-col gap-3">

            {/* Image gallery */}
            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="flex gap-2 p-2">
                {/* Main image */}
                <div className="relative flex-1 overflow-hidden rounded-md" style={{ height: 200 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMAGES[activeImg]} alt="car" className="h-full w-full object-cover" />
                  {/* nav arrows */}
                  <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
                    <button onClick={prev} className="grid h-7 w-7 place-items-center rounded-full bg-white/80 shadow hover:bg-white">
                      <ChevronLeft size={14} className="text-[#374151]" />
                    </button>
                    <button onClick={next} className="grid h-7 w-7 place-items-center rounded-full bg-white/80 shadow hover:bg-white">
                      <ChevronRight size={14} className="text-[#374151]" />
                    </button>
                  </div>
                </div>
                {/* Thumbnails */}
                <div className="flex flex-col gap-1.5">
                  {IMAGES.map((src, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`h-[46px] w-[62px] overflow-hidden rounded border-2 transition-all ${i === activeImg ? "border-[#1a56db]" : "border-transparent hover:border-[#93c5fd]"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vehicle Overview accordion */}
            <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
              <Accordion title="Vehicle Overview" open={overviewOpen} onToggle={() => setOverviewOpen(o => !o)}>
                <div className="pb-1">
                  <SpecRow label="Features" value="209" />
                  <SpecRow label="Body Style" value="4 Door Sedan" />
                  <SpecRow label="Drive Type" value="FWD" />
                  <SpecRow label="Exterior Color" value="Sonic Gray" />
                  <SpecRow label="Interior Color" value="Black/Red" />
                  <SpecRow label="Engine" value="1.5L I-4 Turbo" />
                  <SpecRow label="Horsepower" value="200" />
                  <SpecRow label="Stock #" value="112376" />
                  <SpecRow label="Certified" value="N/A" />
                  <SpecRow label="VIN" value="3C4PDCVV7KT845744" />
                </div>
              </Accordion>
              <Accordion title="Features" open={featuresOpen} onToggle={() => setFeaturesOpen(o => !o)} />
              <Accordion title="Safety" open={safetyOpen} onToggle={() => setSafetyOpen(o => !o)} />
            </div>
          </div>

          {/* RIGHT column */}
          <div className="flex flex-col gap-3">

            {/* Financing */}
            <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
              <p className="mb-2 text-[11px] font-bold text-[#111827]">Financing</p>
              <FinRow label="Sales Price*" value="$31,295.00" />
              <FinRow label="Total Fees & Taxes" value="$2,513.00" />
              <FinRow label="Warranty" value="ask dealer" />
              <FinRow label="GAP" value="ask dealer" />
              <FinRow label="Cash Price" value="$33,808.00" bold />
              <FinRow label="Net Trade" value="$500.00" />
              <FinRow label="Rebate" value="$0.00" />
              <FinRow label="Down Payment" value="$5,000.00" />
              <FinRow label="Loan Balance" value="$28,308.00" bold />
              <FinRow label="Term" value="72" />
              <FinRow label="APR" value="23.700%" />
              <p className="mt-2 text-[7.5px] leading-[1.5] text-[#9ca3af]">
                *Prices do not include government fees and taxes, any finance charge, any dealer document processing charge, any electronic filing charge and any emissions testing charge. Fee, tax, and product amounts are close estimates meaning the resulting Loan Amount, Monthly Payment, and APR are estimates as well. All numbers will be finalized upon making your deposit or may contact an agent if you have questions:{" "}
                <span className="text-[#1a56db]">888-909-3638</span>
              </p>
            </div>

            {/* Dealer info */}
            <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#111827]">Sterling McCall Honda</p>
                  <p className="mt-1 text-[9px] text-[#6b7280]">18818 Highway 59 N Houston, TX 77396</p>
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    <a href="#" className="flex items-center gap-1 text-[9px] text-[#1a56db] hover:underline">
                      <Phone size={9} />(832) 991-7728
                    </a>
                    <a href="#" className="flex items-center gap-1 text-[9px] text-[#1a56db] hover:underline">
                      <Mail size={9} />sales@sterlingmccallhonda.com
                    </a>
                  </div>
                </div>
                <button className="shrink-0 rounded border border-[#d1d5db] bg-white px-3 py-1.5 text-[9px] font-semibold text-[#374151] hover:bg-[#f9fafb]">
                  Contact Dealer
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function DemoSaas() {
  return (
    <SafariFrame url="autoapp.io/vehicles/2023-honda-civic-si" ratio="desktop">
      <AutoFinanceDashboard />
    </SafariFrame>
  );
}
