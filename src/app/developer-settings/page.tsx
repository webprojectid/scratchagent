import { notFound, redirect } from "next/navigation";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";
import { DeveloperWorkspace } from "@/components/developer-workspace";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/developer-settings");
  if (await requireAdmin(user)) notFound();
  const { tab } = await searchParams;
  return <DeveloperWorkspace email={user.email!} initialTab={tab === "users" || tab === "security" ? tab : "llm"}/>;
}
