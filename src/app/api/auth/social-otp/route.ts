import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, parseAccountBody } from "@/lib/account-api";
import { getSupabaseSessionIdentity } from "@/lib/supabase/session-identity";
import { isSocialSessionVerified, issueSocialCode, verifySocialCode } from "@/lib/social-email-otp";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";
const inputSchema = z.discriminatedUnion("action", [z.object({ action: z.literal("send"), language: z.enum(["en", "id"]).default("en") }).strict(), z.object({ action: z.literal("verify"), code: z.string().regex(/^\d{6}$/) }).strict()]);
const noStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const session = await getSupabaseSessionIdentity();
    if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers: noStore });
    return NextResponse.json({ verified: await isSocialSessionVerified(session.identity), email: session.identity.email }, { headers: noStore });
  } catch { return NextResponse.json({ error: "Verification is temporarily unavailable." }, { status: 503, headers: noStore }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  try {
    const session = await getSupabaseSessionIdentity();
    if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const input = await parseAccountBody(request, inputSchema);
    if (rateLimit(`social-otp:${session.identity.sessionId}`, 15, 60_000) !== null) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
    if (input.action === "send") return NextResponse.json(await issueSocialCode(session.identity, input.language), { headers: noStore });
    const verified = await verifySocialCode(session.identity, input.code);
    return NextResponse.json(verified ? { verified: true } : { error: "The code is invalid or expired. Request a new code and try again." }, { status: verified ? 200 : 400, headers: noStore });
  } catch (cause) {
    if (cause instanceof z.ZodError || cause instanceof SyntaxError) return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
    // Service and provider errors must never expose credentials or response payloads.
    return NextResponse.json({ error: "We could not complete verification. Wait a minute and try again." }, { status: 503, headers: noStore });
  }
}
