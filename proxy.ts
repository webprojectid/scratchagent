import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16: middleware -> proxy. Tugasnya refresh session Supabase tiap request.
// Guard: skip kalau Supabase belum dikonfigurasi (anon key masih placeholder),
// biar app tetep jalan pake auth lama selama belum diisi.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configured =
    url && anonKey && url.startsWith("https://") && !anonKey.startsWith("ISI_");
  if (!configured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh token session kalau perlu (jangan skip ini).
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Jalan di semua route kecuali static assets & auth callback.
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$).*)",
  ],
};
