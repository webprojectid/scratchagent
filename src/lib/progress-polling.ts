export function progressPollDelay(status: string, failures = 0): number {
  const base = status === "generating" ? 3_000 : status === "implementing" ? 10_000 : status === "done" ? 120_000 : 30_000;
  return Math.min(120_000, base * 2 ** Math.min(failures, 5));
}

type PollEnvironment = {
  hidden: () => boolean;
  onVisibility: (listener: () => void) => () => void;
  schedule: (callback: () => void, delay: number) => () => void;
};

export function startProgressPolling(status: string, poll: (signal: AbortSignal) => Promise<boolean>, env: PollEnvironment): () => void {
  let active = true, running = false, failures = 0;
  let cancelTimer: (() => void) | undefined;
  let controller: AbortController | undefined;
  const run = async () => {
    if (!active || running || env.hidden()) return;
    running = true;
    controller = new AbortController();
    try {
      const ok = await poll(controller.signal);
      failures = ok ? 0 : failures + 1;
    } catch { failures++; }
    finally {
      running = false;
      if (active && !env.hidden()) cancelTimer = env.schedule(() => { void run(); }, progressPollDelay(status, failures));
    }
  };
  const unsubscribe = env.onVisibility(() => {
    cancelTimer?.();
    controller?.abort();
    if (!env.hidden()) void run();
  });
  void run();
  return () => { active = false; cancelTimer?.(); controller?.abort(); unsubscribe(); };
}
