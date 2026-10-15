export type DashboardDay = { date: string; visits: number; actions: number };
export function dayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function dashboardDays(rows: { createdAt?: string; date?: string; kind: string; count?: number }[], timezone: string, now = new Date()): DashboardDay[] {
  const today = dayKey(now, timezone);
  const anchor = new Date(`${today}T12:00:00Z`);
  const days = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(anchor); date.setUTCDate(date.getUTCDate() - 364 + index);
    return { date: date.toISOString().slice(0, 10), visits: 0, actions: 0 };
  });
  const byDate = new Map(days.map(day => [day.date, day]));
  for (const row of rows) {
    const date = row.createdAt ? new Date(row.createdAt) : null;
    if (date && (!Number.isFinite(date.getTime()) || date > now)) continue;
    const day = byDate.get(row.date ?? (date ? dayKey(date, timezone) : ""));
    if (day) { if (row.kind === "site_visit") day.visits += row.count ?? 1; else day.actions += row.count ?? 1; }
  }
  return days;
}
export type FilterableToken = { revoked: boolean; createdAt?: string; revokedAt?: string | null; lastUsedAt?: string | null; expiresAt?: string | null };
export function tokenGroup(token: FilterableToken, now: number): "active" | "revoked" | "expired" {
  return token.revoked ? "revoked" : token.expiresAt && Date.parse(token.expiresAt) <= now ? "expired" : "active";
}
export function filterTokens<T extends FilterableToken>(tokens: T[], group: "active" | "revoked" | "expired", recent: boolean, now: number): T[] {
  const timestamp = (token: T) => group === "revoked" ? Date.parse(token.revokedAt ?? token.createdAt ?? "") : group === "expired" ? Date.parse(token.expiresAt ?? "") : Math.max(Date.parse(token.createdAt ?? "") || 0, Date.parse(token.lastUsedAt ?? "") || 0);
  return tokens.filter(token => tokenGroup(token, now) === group && (!recent || timestamp(token) >= now - 3 * 86400_000 && timestamp(token) <= now)).sort((a, b) => timestamp(b) - timestamp(a));
}
