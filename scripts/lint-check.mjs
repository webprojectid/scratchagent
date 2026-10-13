import { ESLint } from "eslint";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export function fingerprint(file, message, source, root = process.cwd()) {
  const line = source.split(/\r?\n/)[message.line - 1]?.trim() ?? "";
  const detail = message.message.replaceAll("\\", "/").replaceAll(root.replaceAll("\\", "/"), "<repo>");
  return createHash("sha256").update(JSON.stringify([file, message.ruleId, message.severity, detail, line])).digest("hex");
}

export async function checkLint() {
  const baseline = JSON.parse(readFileSync("scripts/lint-baseline.json", "utf8"));
  const allowed = new Map(Object.entries(baseline.entries).map(([key, value]) => [key, value.count]));
  const results = await new ESLint().lintFiles(["."]);
  const fresh = [];
  let existing = 0;
  for (const result of results) {
    const file = path.relative(process.cwd(), result.filePath).split(path.sep).join("/");
    const source = result.source ?? readFileSync(result.filePath, "utf8");
    for (const message of result.messages) {
      const key = fingerprint(file, message, source);
      const remaining = allowed.get(key) ?? 0;
      if (remaining > 0) { allowed.set(key, remaining - 1); existing++; }
      else fresh.push(`${file}:${message.line}:${message.column} ${message.ruleId ?? "parse"}: ${message.message}`);
    }
  }
  if (fresh.length) {
    console.error(fresh.join("\n"));
    console.error(`${fresh.length} new lint findings. Fix the code; do not regenerate the baseline.`);
    process.exitCode = 1;
  }
  console.log(`Lint baseline: ${existing} existing findings; ${fresh.length} new. Full output: npm run lint:full.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/lint-check.mjs")) await checkLint();
