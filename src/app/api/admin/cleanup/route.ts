import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { plans, features, subFeatures, tasks, taskEvents, usageEvents } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST() {
  try {
    const db = getDb();
    const allPlans = await db.select().from(plans);

    const keep = allPlans.find(
      (p) => p.title?.toLowerCase().includes("kamera") && p.status === "ready"
    );

    if (!keep) {
      return NextResponse.json({ error: "Kamera plan not found" }, { status: 404 });
    }

    const deleteIds = allPlans.filter((p) => p.id !== keep.id).map((p) => p.id);

    if (deleteIds.length === 0) {
      return NextResponse.json({ deleted: 0, kept: keep.title });
    }

    for (const id of deleteIds) {
      await db.delete(taskEvents).where(eq(taskEvents.planId, id));
      await db.delete(usageEvents).where(eq(usageEvents.planId, id));
      await db.delete(tasks).where(eq(tasks.planId, id));

      const featureIds = await db
        .select({ id: features.id })
        .from(features)
        .where(eq(features.planId, id));

      if (featureIds.length > 0) {
        const fIds = featureIds.map((f) => f.id);
        await db.delete(subFeatures).where(inArray(subFeatures.featureId, fIds));
        await db.delete(features).where(eq(features.planId, id));
      }

      await db.delete(plans).where(eq(plans.id, id));
    }

    return NextResponse.json({ deleted: deleteIds.length, kept: keep.title });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
