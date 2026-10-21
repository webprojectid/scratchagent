import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseSessionIdentity } from "@/lib/supabase/session-identity";
import { createRecoveryProof, recoveryCookie } from "@/lib/password-recovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const failed = () => {
    const response = NextResponse.redirect(new URL("/forgot-password?expired=1", url.origin));
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (!tokenHash || tokenHash.length > 512) return failed();
  try {
    const supabase = await createClient();
    const result = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (result.error || !result.data.session) return failed();
    const session = await getSupabaseSessionIdentity();
    if (!session) return failed();
    const response = NextResponse.redirect(new URL("/reset-password", url.origin));
    response.cookies.set(recoveryCookie, createRecoveryProof(session.identity.authUserId, session.identity.sessionId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return failed(); }
}
