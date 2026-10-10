import { NextResponse } from "next/server";
import { accountRequest, accountError } from "@/lib/account-api";
import { dashboardActivity, getAccountSettings, recordSiteVisit } from "@/lib/account-store";
import { dashboardDays } from "@/lib/account-dashboard";
export async function GET(request: Request) {
  try {
    const { user, error } = await accountRequest(request); if (error) return error;
    const [rows, settings] = await Promise.all([dashboardActivity(user.userId), getAccountSettings(user.userId)]);
    return NextResponse.json({ days: dashboardDays(rows, settings.display.timezone), timezone: settings.display.timezone }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return accountError(error); }
}
export async function POST(request: Request) {
  try {
    const { user, error } = await accountRequest(request, true); if (error) return error;
    await recordSiteVisit(user.userId);
    return NextResponse.json({ ok: true });
  } catch (error) { return accountError(error); }
}
