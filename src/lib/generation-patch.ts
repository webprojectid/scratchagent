import { extractGenerationJson } from "./generation-json";

export function mergeGenerationPatch(response: unknown, previous?: string): unknown {
  if (!response || typeof response !== "object" || !("patch" in response)) return response;
  if (!previous) throw new Error("JSON parsing gagal: patch requires an existing draft");
  const draft = JSON.parse(extractGenerationJson(previous));
  const patch = (response as { patch: unknown }).patch;
  if (!Array.isArray(patch) || !patch.length || patch.length > 24) throw new Error("JSON parsing gagal: invalid patch list");
  for (const change of patch) {
    if (!["replace", "add"].includes(change?.op) || typeof change.path !== "string" || !change.path.startsWith("/")) throw new Error("JSON parsing gagal: only replace and missing-field add operations are allowed");
    const keys = change.path.slice(1).split("/").map((key: string) => key.replace(/~1/g, "/").replace(/~0/g, "~"));
    if (keys.some((key: string) => ["__proto__", "prototype", "constructor"].includes(key))) throw new Error("JSON parsing gagal: unsafe patch path");
    let parent = draft;
    for (const key of keys.slice(0, -1)) {
      if (!parent || typeof parent !== "object" || !Object.hasOwn(parent, key)) throw new Error("JSON parsing gagal: unknown patch path");
      parent = parent[key];
    }
    const last = keys.at(-1)!;
    if (!parent || typeof parent !== "object") throw new Error("JSON parsing gagal: patch parent does not exist");
    if (change.op === "replace" && !Object.hasOwn(parent, last)) throw new Error("JSON parsing gagal: replacement target does not exist; replace its existing parent field, or use add with /- to append a missing array item");
    if (change.op === "add" && Array.isArray(parent)) {
      const append = last === '-' || /^(?:0|[1-9]\d*)$/.test(last) && Number(last) === parent.length;
      if (!append || parent.length >= 500) throw new Error("JSON parsing gagal: array add cannot target an existing index; use replace to correct it or /- to append without changing existing items");
      parent.push(change.value);
      continue;
    }
    if (change.op === "add" && Object.hasOwn(parent, last)) throw new Error("JSON parsing gagal: add cannot overwrite an existing field");
    parent[last] = change.value;
  }
  return draft;
}
