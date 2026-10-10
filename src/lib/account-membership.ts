export type AccountMembership = { role?: string; tier?: string; proActive?: boolean };

export function effectiveAccountTier(account: AccountMembership): "free" | "pro" | undefined {
  if (account.tier === "free" || account.proActive === false) return "free";
  if (account.tier === "pro" && account.proActive === true) return "pro";
  return undefined;
}

export function accountBadges(account: AccountMembership) {
  const tier = effectiveAccountTier(account);
  return [...(account.role === "admin" ? ["admin" as const] : []), tier ?? "pending" as const];
}
