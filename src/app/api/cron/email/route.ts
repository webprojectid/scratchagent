import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { scheduleEmailReminders, deliverEmailQueue } from "@/lib/email-notifications";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await scheduleEmailReminders();
    return NextResponse.json(await deliverEmailQueue(50), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Email processing is temporarily unavailable." }, { status: 503 }); }
}
