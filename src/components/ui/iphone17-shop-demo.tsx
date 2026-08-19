"use client";

// iPhone 17 frame: titanium finish, kamera baru (horizontal pill kiri atas),
// Dynamic Island (pill horizontal, lebih lebar dari 16), tombol Action + Power.
// Proporsi 9:19.5 mengikuti iPhone 17 standar.

import { ProductCard } from "@/components/ui/product-card-1";

function IPhone17Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] bg-black shadow-[0_20px_60px_rgba(0,0,0,.7),inset_0_0_0_1px_rgba(255,255,255,.08)]"
           style={{ border: "3px solid #2C2C30" }}>

        {/* Titanium side sheen — top highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[36px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Action button — kiri atas */}
        <div className="absolute -left-[4px] top-[96px] h-[32px] w-[3px] rounded-l-full bg-[#2C2C30]" />
        {/* Volume buttons — kiri */}
        <div className="absolute -left-[4px] top-[148px] h-[44px] w-[3px] rounded-l-full bg-[#2C2C30]" />
        <div className="absolute -left-[4px] top-[200px] h-[44px] w-[3px] rounded-l-full bg-[#2C2C30]" />
        {/* Power button — kanan */}
        <div className="absolute -right-[4px] top-[164px] h-[64px] w-[3px] rounded-r-full bg-[#2C2C30]" />

        {/* Status bar */}
        <div className="relative flex shrink-0 items-center justify-between px-6 pt-3 pb-1">
          <span className="text-[8px] font-semibold text-white">9:41</span>
          {/* Dynamic Island — pill lebih lebar dari iPhone 16 */}
          <div className="absolute left-1/2 top-2 h-[18px] w-[88px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[.06]" />
          <span className="flex items-center gap-1 text-white">
            {/* signal */}
            <svg width="11" height="8" viewBox="0 0 17 12" fill="currentColor">
              <rect x="0" y="4" width="3" height="8" rx="1" />
              <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" />
              <rect x="9" y="0.5" width="3" height="11.5" rx="1" />
              <rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity=".3" />
            </svg>
            {/* battery */}
            <svg width="16" height="8" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="1" width="21" height="10" rx="3" stroke="currentColor" strokeWidth="1" />
              <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
              <rect x="2" y="2.5" width="14" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </span>
        </div>

        {/* Camera bar — horizontal pill di atas kiri (iPhone 17 design) */}
        <div className="absolute left-5 top-[30px] flex h-[14px] items-center gap-1.5 rounded-full bg-[#111] px-2 ring-1 ring-white/[.06]">
          {/* wide lens */}
          <span className="size-[8px] rounded-full bg-[#1a1a1a] ring-1 ring-white/10">
            <span className="block size-full scale-[0.5] rounded-full bg-[#334]" />
          </span>
          {/* ultra-wide lens */}
          <span className="size-[6px] rounded-full bg-[#1a1a1a] ring-1 ring-white/10" />
          {/* flash */}
          <span className="size-[4px] rounded-full bg-[#443322]/80" />
        </div>

        {/* Content scroll area */}
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex shrink-0 justify-center py-2">
          <div className="h-[4px] w-[100px] rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}

export function IPhone17ShopDemo() {
  return (
    <IPhone17Frame>
      <ProductCard
        name="Nike Air Force 1"
        price={129.99}
        originalPrice={169.99}
        rating={4.7}
        reviewCount={325}
        discount={25}
        freeShipping
        isNew
        isBestSeller
        colors={["#1e293b", "#f43f5e", "#0ea5e9", "#10b981"]}
        sizes={["38", "39", "40", "41", "42", "43"]}
        images={[
          "https://images.unsplash.com/photo-1543508282-6319a3e2621f?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1656230259229-aa2634e3352c?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1579338559194-a162d19bf842?q=80&w=800&auto=format&fit=crop",
        ]}
      />
    </IPhone17Frame>
  );
}
