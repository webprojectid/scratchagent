import { NextResponse } from "next/server";
import { getRequestUser, planOwnerKey, unauthorized } from "@/lib/api-auth";
import { listPlanSummaries } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Param userId hanya dipakai sebagai fallback di mode dev polos (tanpa DB & Supabase).
  const user = await getRequestUser(searchParams.get("userId"));
  if (!user) return unauthorized();

  // Jalur ringkas: 3 query tetap berapa pun jumlah plan, tanpa hydrate
  // penuh tiap plan (getPlan + render diagram). Untuk halaman daftar saja;
  // halaman detail tetap pakai getPlan().
  const plans = await listPlanSummaries(planOwnerKey(user));
  return NextResponse.json({ plans });
}
