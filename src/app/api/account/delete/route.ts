import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { accountRequest, accountError, parseAccountBody } from "@/lib/account-api";
import { createClient } from "@/lib/supabase/server";
import { deleteApplicationData } from "@/lib/account-store";
import { rateLimit } from "@/lib/security";
export async function POST(request: Request) {
  try {
    const { user, error } = await accountRequest(request, true); if (error) return error;
    if (user.via !== "session") return NextResponse.json({ error: apiText("Login ulang untuk menghapus akun.") }, { status: 403 });
    const retry = rateLimit(`delete-account:${user.userId}`, 3, 15 * 60_000);
    if (retry !== null) return NextResponse.json({ error: apiText("Terlalu banyak percobaan. Tunggu 15 menit.") }, { status: 429 });
    const input = await parseAccountBody(request, z.object({ confirmation: z.literal("DELETE ACCOUNT"), password: z.string().min(1).max(200) }).strict());
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key || !process.env.DATABASE_URL) return NextResponse.json({ error: apiText("Penghapusan akun belum diaktifkan oleh pengelola. Download data Anda terlebih dahulu.") }, { status: 503 });
    const server = await createClient();
    const { data } = await server.auth.getUser();
    if (!data.user?.email || data.user.email !== user.email) return NextResponse.json({ error: apiText("Sesi tidak valid.") }, { status: 401 });
    // Re-authenticate in an isolated client so a failed attempt cannot replace the browser session.
    const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await verifier.auth.signInWithPassword({ email: data.user.email, password: input.password });
    if (auth.error || auth.data.user?.id !== data.user.id) return NextResponse.json({ error: apiText("Password tidak cocok.") }, { status: 403 });
    const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const removed = await admin.auth.admin.deleteUser(data.user.id);
    if (removed.error) return NextResponse.json({ error: apiText("Akun belum bisa dihapus. Coba lagi.") }, { status: 503 });
    await deleteApplicationData(user.userId);
    await server.auth.signOut({ scope: "local" });
    return NextResponse.json({ ok: true });
  } catch (error) { return accountError(error); }
}
