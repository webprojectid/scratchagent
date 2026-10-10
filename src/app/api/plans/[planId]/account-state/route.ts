import { NextResponse } from "next/server";
import { z } from "zod";
import { accessPlan } from "@/lib/api-auth";
import { accountRequest, accountError, parseAccountBody } from "@/lib/account-api";
import { getProjectState, saveProjectState } from "@/lib/account-store";
type Context = { params: Promise<{ planId: string }> };
export async function GET(request: Request, context: Context) {
  try { const { user, error } = await accountRequest(request); if (error) return error;
    const { planId } = await context.params; const access = await accessPlan(planId, user); if (access.error) return access.error;
    return NextResponse.json(await getProjectState(planId));
  } catch (error) { return accountError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { const { user, error } = await accountRequest(request, true); if (error) return error;
    const { planId } = await context.params; const access = await accessPlan(planId, user, { write: true }); if (access.error) return access.error;
    const input = await parseAccountBody(request, z.object({ favorite: z.boolean().optional(), archived: z.boolean().optional(), opened: z.literal(true).optional() }).strict());
    await saveProjectState(planId, { ...(input.favorite !== undefined ? { favorite: input.favorite } : {}), ...(input.archived !== undefined ? { archived: input.archived } : {}), ...(input.opened ? { lastOpenedAt: new Date().toISOString() } : {}) });
    return NextResponse.json(await getProjectState(planId));
  } catch (error) { return accountError(error); }
}
