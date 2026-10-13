import { test } from "node:test";
import assert from "node:assert/strict";

test("lint fingerprints normalize compiler diagnostic paths across local and CI checkouts", async () => {
  const { fingerprint } = await import("../scripts/lint-check.mjs");
  const common = { ruleId: "react-hooks/refs", severity: 2, line: 1 };
  const windows = { ...common, message: "Cannot access refs\nD:\\Project\\scratchagent\\src\\example.tsx:1:2" };
  const linux = { ...common, message: "Cannot access refs\n/home/runner/work/scratchagent/scratchagent/src/example.tsx:1:2" };
  const file = "src/example.tsx", source = "liveRef.current = options;";
  assert.equal(fingerprint(file, windows, source, "D:\\Project\\scratchagent"), fingerprint(file, linux, source, "/home/runner/work/scratchagent/scratchagent"));
  assert.notEqual(fingerprint(file, linux, source, "/home/runner/work/scratchagent/scratchagent"), fingerprint(file, linux, "otherRef.current = options;", "/home/runner/work/scratchagent/scratchagent"));
});
