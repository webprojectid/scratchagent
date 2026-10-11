export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span className="font-mono text-xs text-muted-foreground">Memuat visual roadmap...</span>
      </div>
    </div>
  );
}
