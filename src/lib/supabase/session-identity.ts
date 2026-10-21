import { createClient } from "./server";
import { socialOtpRequired, type SocialIdentity } from "../social-email-otp";

/** Resolves the provider's authenticated identity before the application's OTP gate. */
export async function getSupabaseSessionIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  const result = await supabase.auth.getClaims();
  const claims = result.data?.claims;
  const sessionId = claims?.session_id;
  if (result.error || claims?.sub !== data.user.id || typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const identity: SocialIdentity = { authUserId: data.user.id, email: data.user.email, sessionId, required: socialOtpRequired(data.user.app_metadata.provider, claims.amr) };
  return { identity, user: data.user, issuedAt: claims.iat };
}
