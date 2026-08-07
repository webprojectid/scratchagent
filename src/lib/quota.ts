const counts = new Map<string, { count: number; resetAt: number }>();

export function getQuota(userId: string): { remaining: number; limit: number; resetAt: number } {
  const limit = Number(process.env.QUOTA_GENERATE_DAILY ?? 3);
  const now = Date.now();
  const record = counts.get(userId);
  if (!record || record.resetAt < now) {
    counts.set(userId, { count: 0, resetAt: now + 24 * 60 * 60 * 1000 });
    return { remaining: limit, limit, resetAt: now + 24 * 60 * 60 * 1000 };
  }
  return { remaining: Math.max(0, limit - record.count), limit, resetAt: record.resetAt };
}

export function consumeQuota(userId: string): boolean {
  const { remaining } = getQuota(userId);
  if (remaining <= 0) return false;
  const record = counts.get(userId)!;
  record.count++;
  return true;
}
