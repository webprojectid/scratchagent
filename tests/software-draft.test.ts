import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreSoftwareDraft } from "@/lib/software-draft";
function storage(entries: Record<string,string>) {
  const values = new Map(Object.entries(entries));
  return { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => { values.set(key,value); }, removeItem: (key:string) => { values.delete(key); } };
}
test("existing software drafts and generation state survive removal of the project selector", () => {
  const saved = storage({ rv_brief:"Software draft",rv_prefs:"Software choices",rv_answers:"Optional answers",rv_generation_plan_id:"synthetic-plan" });
  assert.equal(restoreSoftwareDraft(saved),"Software draft");
  assert.equal(saved.getItem("rv_prefs"),"Software choices");
  assert.equal(saved.getItem("rv_answers"),"Optional answers");
  assert.equal(saved.getItem("rv_generation_plan_id"),"synthetic-plan");
});
test("a retired hardware draft restores saved software choices without mixing their content", () => {
  const saved = storage({ rv_domain:"physical",rv_brief:"Retired draft",rv_prefs:"Retired choices",rv_brief_software:"Saved software",rv_prefs_software:"Saved choices",rv_answers:"Retired answers",rv_physical_v1:"Retired configuration",rv_generation_plan_id:"retired-plan" });
  assert.equal(restoreSoftwareDraft(saved),"Saved software");
  assert.equal(saved.getItem("rv_prefs"),"Saved choices");
  for(const key of ["rv_domain","rv_answers","rv_physical_v1","rv_generation_plan_id"]) assert.equal(saved.getItem(key),null);
  assert.equal(restoreSoftwareDraft(saved),"Saved software");
});
test("a retired draft with no saved software starts empty", () => {
  const saved = storage({rv_domain:"physical",rv_brief:"Retired brief",rv_handoff:"Retired handoff"});
  assert.equal(restoreSoftwareDraft(saved),"");
  assert.equal(saved.getItem("rv_handoff"),null);
});
