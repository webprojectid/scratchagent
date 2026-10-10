import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/account-workspace";
import { resolveAccountRoute, type AccountSearchParams } from "@/lib/account-navigation";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const route = resolveAccountRoute("profile", await searchParams);
  if (route.redirectTo) redirect(route.redirectTo);
  return <AccountWorkspace key="profile" area="profile" initialTab={route.tab}/>;
}
