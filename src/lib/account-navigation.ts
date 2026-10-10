export const profileTabs = ["profile", "plans", "billing", "activity", "library"] as const;
export const settingsTabs = ["preferences", "language", "handoff", "security", "tokens", "notifications", "privacy"] as const;
export type AccountTab = typeof profileTabs[number] | typeof settingsTabs[number];
export type AccountArea = "profile" | "settings";
export type AccountSearchParams = Record<string, string | string[] | undefined>;

export const accountMenuLinks = [
  { label: "Profil", href: "/profile", icon: "profile" },
  { label: "Pengaturan", href: "/settings", icon: "settings" },
  { label: "Dokumentasi", href: "/docs", icon: "docs" },
] as const;

export function isAccountTab(value: string | null | undefined): value is AccountTab {
  return [...profileTabs, ...settingsTabs].some(tab => tab === value);
}

export function accountAreaForTab(tab: AccountTab): AccountArea {
  return profileTabs.some(item => item === tab) ? "profile" : "settings";
}

export function defaultAccountTab(area: AccountArea): AccountTab {
  return area === "profile" ? "profile" : "preferences";
}

export function accountTabHref(tab: AccountTab, search = ""): string {
  const area = accountAreaForTab(tab);
  const params = new URLSearchParams(search);
  params.delete("tab");
  if (tab !== defaultAccountTab(area)) params.set("tab", tab);
  const query = params.toString();
  return `/${area}${query ? `?${query}` : ""}`;
}

export function resolveAccountRoute(area: AccountArea, search: AccountSearchParams) {
  const rawTab = Array.isArray(search.tab) ? search.tab[0] : search.tab;
  if (rawTab === "llm") return { tab: defaultAccountTab(area), redirectTo: "/developer-settings?tab=llm" };
  const tab = isAccountTab(rawTab) ? rawTab : defaultAccountTab(area);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, entry);
  }
  return { tab, redirectTo: accountAreaForTab(tab) !== area ? accountTabHref(tab, params.toString()) : null };
}
