import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handle callback OAuth dari Supabase (Google / GitHub).
// Abis tuker code jadi session, lempar ke /auth/complete (client) buat
// verifikasi session lalu lanjut. Client membaca session Supabase langsung.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/complete`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
