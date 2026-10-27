export type ProjectDomain = "software" | "physical";
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function switchProjectDraft(storage: DraftStorage, previous: ProjectDomain, next: ProjectDomain) {
  if (previous === next) return;
  for (const key of ["rv_prefs", "rv_answers", "rv_handoff"]) {
    const current = storage.getItem(key);
    if (current !== null) storage.setItem(`${key}_${previous}`, current);
    else storage.removeItem(`${key}_${previous}`);
    const restored = storage.getItem(`${key}_${next}`);
    if (restored !== null) storage.setItem(key, restored);
    else storage.removeItem(key);
  }
  storage.removeItem("rv_generation_plan_id");
  storage.removeItem("rv_generating");
}
