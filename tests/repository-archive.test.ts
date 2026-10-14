import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

test("source archive includes the safe setup template and excludes private environment files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "scratchagent-source-archive-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  try {
    git("init", "--quiet");
    git("config", "user.name", "Archive fixture"); git("config", "user.email", "fixture@example.test");
    git("config", "commit.gpgsign", "false");
    copyFileSync(".gitattributes", path.join(root, ".gitattributes"));
    writeFileSync(path.join(root, ".env.example"), "CONFIG=\n");
    writeFileSync(path.join(root, ".env"), "SYNTHETIC=must-not-be-exported\n");
    git("add", ".gitattributes", ".env.example", ".env"); git("commit", "--quiet", "-m", "Synthetic archive fixture");
    const archive = git("archive", "--format=tar", "HEAD");
    const names: string[] = [];
    for (let offset = 0; offset < archive.length;) {
      const header = archive.subarray(offset, offset + 512);
      if (header.every(byte => byte === 0)) break;
      const name = header.subarray(0, 100).toString().replace(/\0.*$/s, "");
      const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/s, "").trim() || "0", 8);
      names.push(name);
      offset += 512 + Math.ceil(size / 512) * 512;
    }
    assert.ok(names.includes(".env.example"));
    assert.ok(!names.includes(".env"));
    assert.ok(!archive.includes(Buffer.from("must-not-be-exported")));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
