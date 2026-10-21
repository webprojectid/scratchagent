import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, parseAccountBody } from "@/lib/account-api";
import { getSupabaseSessionIdentity } from "@/lib/supabase/session-identity";
import { createClient } from "@/lib/supabase/server";
import { recoveryCookie, validRecoveryProof } from "@/lib/password-recovery";
import { rateLimit } from "@/lib/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  try {
    const session = await getSupabaseSessionIdentity();
    const jar = await cookies();
    if (!session || !validRecoveryProof(jar.get(recoveryCookie)?.value ?? "", session.identity.authUserId, session.identity.sessionId)) return NextResponse.json({ error: "Request a new password reset email." }, { status: 403 });
    if (rateLimit(`password-recovery:${session.identity.authUserId}`, 5, 600_000) !== null) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
    const body = await parseAccountBody(request, z.object({ password: z.string().min(8).max(128) }).strict());
    const supabase = await createClient();
    const result = await supabase.auth.updateUser({ password: body.password });
    if (result.error) return NextResponse.json({ error: "The password could not be updated. Choose a different password or request a new link." }, { status: 400 });
    jar.delete(recoveryCookie);
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof z.ZodError || cause instanceof SyntaxError) return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
  }
}
