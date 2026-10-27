import type { AuthUser } from "./api-auth";
import { isDeveloperAdmin } from "./admin-access";
export function hasProFeatures(user: AuthUser | null | undefined, tier: "free" | "pro" = "free"): boolean {
  return tier === "pro" || !!user && user.via === "session" && isDeveloperAdmin(user.email);
}
