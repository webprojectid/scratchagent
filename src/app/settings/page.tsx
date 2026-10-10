import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/account-workspace";
import { resolveAccountRoute, type AccountSearchParams } from "@/lib/account-navigation";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const route = resolveAccountRoute("settings", await searchParams);
  if (route.redirectTo) redirect(route.redirectTo);
  return <AccountWorkspace key="settings" area="settings" initialTab={route.tab}/>;
}
