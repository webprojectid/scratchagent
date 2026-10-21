import { apiText } from "@/lib/ui-messages";
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { accountRequest, accountError, parseAccountBody } from "@/lib/account-api";
import { accountSettingsPatchSchema } from "@/lib/account-preferences";
import { getAccountSettings, saveAccountSettings, listLibrary, saveLibrary, deleteLibrary, listActivity, readNotifications, accountUsage, listSessions, revokeOtherSessions, exportAccountData, recordAccountActivity } from "@/lib/account-store";
import { planOwnerKey } from "@/lib/api-auth";
import { getAccountDetail } from "@/lib/billing";
type Context = { params: Promise<{ resource: string }> };
const itemSchema = z.object({ id: z.uuid().optional(), kind: z.enum(["brief", "template", "reference"]), title: z.string().trim().min(1).max(120), content: z.string().trim().min(3).max(12_000) }).strict();
export async function GET(request: Request, context: Context) {
  try {
    const { user, error } = await accountRequest(request); if (error) return error;
    const { resource } = await context.params;
    const headers = { "Cache-Control": "private, no-store" };
    if (resource === "settings") return NextResponse.json(await getAccountSettings(user.userId), { headers });
    if (resource === "library") return NextResponse.json({ items: await listLibrary(user.userId) }, { headers });
    if (resource === "activity") {
      const detail = await getAccountDetail(user.userId);
      if (detail?.proActive && detail.proExpiresAt && Date.parse(String(detail.proExpiresAt)) - Date.now() < 7 * 86400_000) await recordAccountActivity(user.userId, "plan_expiry", "Masa aktif Pro berakhir dalam 7 hari", null, `expiry:${user.userId}:${detail.proExpiresAt}`);
      return NextResponse.json({ items: await listActivity(user.userId) }, { headers });
    }
    if (resource === "usage") return NextResponse.json({ items: await accountUsage(user.userId) }, { headers });
    if (resource === "sessions") {
      const { createClient } = await import("@/lib/supabase/server");
      const auth = user.via === "session" ? await (await createClient()).auth.getUser() : null;
      return NextResponse.json({ items: await listSessions(user.userId), currentId: user.sessionId ?? null, methods: auth?.data.user?.identities?.map(identity => identity.provider) ?? [], emailVerified: !!auth?.data.user?.email_confirmed_at, deletionAvailable: !!process.env.SUPABASE_SERVICE_ROLE_KEY }, { headers });
    }
    if (resource === "data") return new Response(JSON.stringify(await exportAccountData(user.userId, planOwnerKey(user)), null, 2), { headers: { ...headers, "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="scratchagent-account.json"' } });
    return NextResponse.json({ error: apiText("Halaman tidak ditemukan.") }, { status: 404 });
  } catch (error) { return accountError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { user, error } = await accountRequest(request, true); if (error) return error;
    const { resource } = await context.params;
    if (resource !== "settings") return NextResponse.json({ error: apiText("Tidak ditemukan.") }, { status: 404 });
    const patch = await parseAccountBody(request, accountSettingsPatchSchema);
    const settings = await saveAccountSettings(user.userId, patch);
    if (patch.display?.language && user.via === "session") after(async () => {
      try { const { createClient } = await import("@/lib/supabase/server"); await (await createClient()).auth.updateUser({ data: { language: patch.display!.language } }); }
      catch { console.error("[email-language] Preference sync unavailable"); }
    });
    return NextResponse.json(settings);
  } catch (error) { return accountError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { user, error } = await accountRequest(request, true); if (error) return error;
    const { resource } = await context.params;
    if (resource === "library") {
      const input = await parseAccountBody(request, itemSchema);
      if (!input.id && (await listLibrary(user.userId)).length >= 200) return NextResponse.json({ error: apiText("Pustaka maksimal 200 item. Hapus item yang tidak dipakai.") }, { status: 409 });
      const item = await saveLibrary(user.userId, input);
      return item ? NextResponse.json(item) : NextResponse.json({ error: apiText("Item tidak ditemukan.") }, { status: 404 });
    }
    if (resource === "activity") { await readNotifications(user.userId); return NextResponse.json({ ok: true }); }
    if (resource === "sessions") {
      if (!user.sessionId) return NextResponse.json({ error: apiText("Sesi browser tidak tersedia.") }, { status: 400 });
      const { createClient } = await import("@/lib/supabase/server");
      const { error: signOutError } = await (await createClient()).auth.signOut({ scope: "others" });
      if (signOutError) return NextResponse.json({ error: apiText("Sesi lain belum bisa dicabut.") }, { status: 503 });
      await revokeOtherSessions(user.userId, user.sessionId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: apiText("Tidak ditemukan.") }, { status: 404 });
  } catch (error) { return accountError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { user, error } = await accountRequest(request, true); if (error) return error;
    const { resource } = await context.params;
    if (resource !== "library") return NextResponse.json({ error: apiText("Tidak ditemukan.") }, { status: 404 });
    const { id } = await parseAccountBody(request, z.object({ id: z.uuid() }).strict());
    return await deleteLibrary(user.userId, id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: apiText("Item tidak ditemukan.") }, { status: 404 });
  } catch (error) { return accountError(error); }
}
