import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const patterns = [
  /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@(?!localhost\b|127\.0\.0\.1\b)[^\s"'`]+/,
  /\bsk-[A-Za-z0-9_-]{24,}/,
  /\bsk-[A-Za-z0-9_-]{4,}(?:\.{3}|…)[A-Za-z0-9_-]{4,}/,
];
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
let failed = false;
for (const path of files) {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile() || statSync(path).size > 2_000_000) continue;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (patterns.some(pattern => pattern.test(line))) {
      console.error(`Potential embedded credential: ${path}:${index + 1}`);
      failed = true;
    }
  });
}
if (failed) process.exitCode = 1;
else console.log("Tracked-file credential scan passed. Values are never printed.");
