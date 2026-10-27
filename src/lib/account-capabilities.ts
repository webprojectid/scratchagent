import type { AuthUser } from "./api-auth";
import { isDeveloperAdmin } from "./admin-access";
export function hasProFeatures(user: AuthUser | null | undefined, tier: "free" | "pro" | "max" = "free"): boolean {
  return tier === "max" || tier === "pro" || !!user && user.via === "session" && isDeveloperAdmin(user.email);
}
