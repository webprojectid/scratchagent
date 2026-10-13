import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const patterns = [
  /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@(?!localhost\b|127\.0\.0\.1\b)[^\s"'`]+/,
  /\bsk-[A-Za-z0-9_-]{24,}/,
  /\bsk-[A-Za-z0-9_-]{4,}(?:\.{3}|…)[A-Za-z0-9_-]{4,}/,
  /\bthk_(?:live|test)_[A-Za-z0-9_-]{16,}/,
  /\brv_[a-f0-9]{24,}\b/,
];
if (process.argv.includes("--history")) {
  const entries = execFileSync("git", ["rev-list", "--objects", "--all"], { encoding: "utf8", maxBuffer: 32_000_000 }).trim().split("\n");
  const names = new Map(entries.map(line => { const space = line.indexOf(" "); return [line.slice(0, space < 0 ? line.length : space), space < 0 ? "" : line.slice(space + 1)]; }));
  const metadata = execFileSync("git", ["cat-file", "--batch-check"], { input: [...names.keys()].join("\n") + "\n", encoding: "utf8", maxBuffer: 32_000_000 });
  const blobs = metadata.trim().split("\n").filter(line => line.split(" ")[1] === "blob").map(line => line.split(" ")[0]);
  const batch = execFileSync("git", ["cat-file", "--batch"], { input: blobs.join("\n") + "\n", maxBuffer: 512_000_000 });
  let offset = 0;
  let failed = false;
  let scanned = 0;
  for (const oid of blobs) {
    const end = batch.indexOf(10, offset);
    const size = Number(batch.subarray(offset, end).toString().split(" ")[2]);
    const data = batch.subarray(end + 1, end + 1 + size);
    offset = end + 1 + size + 1;
    if (data.includes(0)) continue;
    scanned++;
    const path = names.get(oid);
    if (/(^|\/)\.env(?:\.(?!example$)[^/]*)?$/.test(path) || patterns.some(pattern => pattern.test(data.toString("utf8")))) {
      console.error(`Historical credential or private env file: ${path || oid}`);
      failed = true;
    }
  }
  console.log(`History checked: ${scanned} text blobs. Credential values are never printed.`);
  process.exit(failed ? 1 : 0);
}
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
