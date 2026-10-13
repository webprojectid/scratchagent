import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const configured = spawnSync("git", ["config", "--get", "core.hooksPath"], { encoding: "utf8" });
if (configured.status !== 0 && configured.status !== 1) {
  console.error("Cannot inspect Git hook configuration. Existing hooks were not changed.");
  process.exit(1);
}
const existing = configured.stdout.trim();
if (existing && existing !== ".githooks") {
  console.error("An existing hook directory is configured. Integrate the security checks there manually; it was not replaced.");
  process.exit(1);
}
if (!existing) {
  for (const name of ["pre-commit", "pre-push"]) {
    const location = execFileSync("git", ["rev-parse", "--git-path", `hooks/${name}`], { encoding: "utf8" }).trim();
    if (existsSync(location)) {
      console.error("An existing local hook was found. It was not replaced; integrate the security checks manually.");
      process.exit(1);
    }
  }
}
execFileSync("git", ["config", "core.hooksPath", ".githooks"]);
console.log("Local pre-commit and pre-push credential checks enabled. No credentials were read or changed.");
