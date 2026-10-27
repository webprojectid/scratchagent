export type AccountMembership = { role?: string; tier?: string; proActive?: boolean; proExpiresAt?: string | null; bannedAt?: string | null };

export function effectiveAccountTier(account: AccountMembership): "free" | "pro" | undefined {
  const expiresAt = account.proExpiresAt ? Date.parse(account.proExpiresAt) : null;
  if (account.bannedAt || account.tier === "free" || account.proActive === false || expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) return "free";
  if (account.tier === "pro" && account.proActive === true) return account.tier;
  return undefined;
}

export function accountBadges(account: AccountMembership) {
  const tier = effectiveAccountTier(account);
  return [...(account.role === "admin" ? ["admin" as const] : []), tier ?? "pending" as const];
}
