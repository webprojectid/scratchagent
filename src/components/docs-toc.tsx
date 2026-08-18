"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/lang";
import { docsCopy } from "@/lib/copy-docs";

/** Rail "Di halaman ini" ala docs modern: sticky di kanan, section aktif ke-highlight. */
export function DocsToc() {
  const c = docsCopy(useLang());
  const [active, setActive] = useState("quickstart");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    c.tocItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label={c.tocTitle} className="sticky top-24 hidden w-48 shrink-0 self-start xl:block">
      <p className="text-[12px] font-medium uppercase tracking-[.08em] text-[#737373]">{c.tocTitle}</p>
      <ul className="mt-4 space-y-0.5 border-l border-white/[.08]">
        {c.tocItems.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => go(item.id)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px block w-full border-l-2 py-1.5 pl-4 pr-2 text-left text-[13px] leading-5 transition-colors",
                  isActive
                    ? "border-[#74FA6A] font-medium text-[#EDEDED]"
                    : "border-transparent text-[#A0A0A0] hover:text-[#EDEDED]",
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
