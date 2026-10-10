"use client";
import { useEffect } from "react";
export function ProjectVisited({ planId }: { planId: string }) {
  useEffect(() => {
    if (planId === "demo") return;
    void fetch(`/api/plans/${encodeURIComponent(planId)}/account-state`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opened: true }) }).catch(() => {});
  }, [planId]);
  return null;
}
