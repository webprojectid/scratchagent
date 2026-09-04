export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D0F] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[#74FA6A]" />
        <span className="font-mono text-xs text-white/50">Memuat visual roadmap...</span>
      </div>
    </div>
  );
}
