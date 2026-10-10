import { apiText } from "@/lib/ui-messages";
import { recordAccountActivity } from "@/lib/account-store";
import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { buildPlanOverview } from "@/lib/plan-overview";
import { updatePlanNotes } from "@/lib/plan-notes";
import { rateLimit } from "@/lib/security";

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser(new URL(request.url).searchParams.get("userId"));
  const { plan, error } = await accessPlan(planId, user);
  if (error) return error;
  return NextResponse.json(buildPlanOverview(plan!), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const source = new URL(origin);
      if (source.host !== (request.headers.get("host") ?? new URL(request.url).host) || !["https:", "http:"].includes(source.protocol)) throw new Error("Cross-origin request");
    } catch { return NextResponse.json({ error: apiText("Permintaan tidak diizinkan.") }, { status: 403 }); }
  }
  const { planId } = await params;
  const user = await getRequestUser(new URL(request.url).searchParams.get("userId"));
  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;
  const retryAfter = rateLimit(`plan-notes:${user!.userId}`, 30, 10 * 60 * 1000);
  if (retryAfter !== null) return NextResponse.json({ error: apiText("Terlalu banyak perubahan. Coba lagi sebentar.") }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  let notes: unknown;
  try {
    const text = await request.text();
    if (text.length > 16000) return NextResponse.json({ error: apiText("Catatan terlalu panjang.") }, { status: 413 });
    notes = JSON.parse(text)?.notes;
  } catch { return NextResponse.json({ error: apiText("Catatan tidak valid.") }, { status: 400 }); }
  if (typeof notes !== "string" || notes.length > 3000 || notes.includes("\u0000")) return NextResponse.json({ error: apiText("Catatan maksimal 3.000 karakter.") }, { status: 400 });
  try {
    const updatedAt = new Date().toISOString();
    if (!await updatePlanNotes(planId, notes, updatedAt)) return NextResponse.json({ error: apiText("Proyek tidak ditemukan.") }, { status: 404 });
    if (user) await recordAccountActivity(user.userId, "revision", "Catatan proyek diperbarui", planId);
    return NextResponse.json({ notes, updatedAt });
  } catch { return NextResponse.json({ error: apiText("Catatan belum bisa disimpan. Coba lagi.") }, { status: 500 }); }
}
