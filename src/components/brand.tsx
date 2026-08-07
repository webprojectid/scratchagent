import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold tracking-[-.03em] text-white">
      Scratch Agent
    </Link>
  );
}

export function Shell({ children, back, sidebar = true }: { children: React.ReactNode; back?: string; sidebar?: boolean }) {
  return (
    <main className="relative min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#1E252F] bg-[#0A0A0A]/80 px-5 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-4">
          {back && (
            <Link href={back} className="grid size-9 place-items-center rounded-[10px] border border-white/12 bg-[#13161A] text-slate-400 transition hover:border-[#74FA6A]/40 hover:text-white" aria-label="Kembali">
              <ArrowLeft size={18} />
            </Link>
          )}
          <Brand />
        </div>
        <span className="hidden font-mono text-[11px] tracking-[.12em] text-[#8C97A5] sm:block">Hire your AI agent.</span>
      </header>
      <div className="flex">
        {sidebar && <Sidebar />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
