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
      {back && (
        <Link
          href={back}
          className="fixed left-4 top-4 z-40 grid size-9 place-items-center rounded-[10px] border border-white/12 bg-[#13161A]/90 text-slate-400 backdrop-blur transition hover:border-[#74FA6A]/40 hover:text-white md:left-6 md:top-5"
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </Link>
      )}
      <div className="flex">
        {sidebar && <Sidebar />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
