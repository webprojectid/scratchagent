type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function restoreSoftwareDraft(storage: DraftStorage): string {
  if (storage.getItem("rv_domain") === "physical") {
    for (const key of ["rv_brief", "rv_prefs", "rv_answers", "rv_handoff"]) {
      const saved = storage.getItem(key + "_software");
      if (saved === null) storage.removeItem(key);
      else storage.setItem(key, saved);
    }
    storage.removeItem("rv_generation_plan_id");
    storage.removeItem("rv_generating");
  }
  for (const key of ["rv_domain", "rv_physical_v1", "rv_brief_physical", "rv_prefs_physical", "rv_answers_physical", "rv_handoff_physical"]) storage.removeItem(key);
  return storage.getItem("rv_brief") ?? "";
}
