import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkTracked, checkHistory } from "../scripts/check-secrets.mjs";

function fixture(run: (root: string, git: (...args: string[]) => void) => void) {
  const root = mkdtempSync(path.join(tmpdir(), "scratchagent-secret-gate-"));
  const git = (...args: string[]) => { execFileSync("git", args, { cwd: root, stdio: "pipe" }); };
  try {
    git("init", "--quiet");
    git("config", "user.name", "Offline security fixture");
    git("config", "user.email", "fixture@example.test");
    git("config", "commit.gpgsign", "false");
    git("config", "core.autocrlf", "false");
    run(root, git);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("private env names and ignored tracked files fail without recognizable keys", () => {
  fixture((root, git) => {
    writeFileSync(path.join(root, ".gitignore"), "*.env*\n.env*\n");
    for (const file of [".env", "production.env", ".env.backup", ".envrc"]) {
      writeFileSync(path.join(root, file), "ANY_FORMAT=synthetic-private-value\n");
      git("add", "--force", "--", file);
    }
    git("add", ".gitignore");
    const result = checkTracked(root);
    assert.ok(result.findings.some((finding: string) => finding.includes("Ignored file still tracked")));
    assert.equal(result.findings.filter((finding: string) => finding.startsWith("Index private")).length, 4);
    assert.ok(result.findings.every((finding: string) => !finding.includes("synthetic-private-value")));
  });
});

test("only the root blank env template and explicit quota default are allowed", () => {
  fixture((root, git) => {
    writeFileSync(path.join(root, ".env.example"), "# Safe template\nAUTH_SECRET=\nLLM_API_KEY=\"\"\nQUOTA_GENERATE_DAILY=3\n");
    git("add", ".env.example");
    assert.deepEqual(checkTracked(root).findings, []);
    writeFileSync(path.join(root, ".env.example"), "AUTH_SECRET=arbitrary-format-value\n");
    assert.ok(checkTracked(root).findings.some((finding: string) => finding.includes("nonempty env template")));
    mkdirSync(path.join(root, "nested"));
    writeFileSync(path.join(root, "nested", ".env.example"), "AUTH_SECRET=\n");
    git("add", "nested/.env.example");
    assert.ok(checkTracked(root).findings.some((finding: string) => finding.includes("private configuration file: nested/.env.example")));
  });
});

test("private audit bundles and network captures are rejected even without ignore rules or recognizable keys", () => {
  fixture((root, git) => {
    const paths = ["artifacts/review.png", "nested/output/report.bin", ".tmp-audit/session.bin", "session.har"];
    for (const file of paths) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), Buffer.from([0, 1, 2, 3]));
      git("add", "--", file);
    }
    const result = checkTracked(root);
    for (const file of paths) assert.ok(result.findings.includes(`Index private configuration file: ${file}`));
  });
});

test("a private binary report cannot be published by deleting it in a later commit", () => {
  fixture((root, git) => {
    mkdirSync(path.join(root, "artifacts"));
    writeFileSync(path.join(root, "artifacts", "capture.png"), Buffer.from([0, 1, 2, 3]));
    git("add", "artifacts/capture.png"); git("commit", "--quiet", "-m", "Local report fixture");
    git("rm", "--quiet", "artifacts/capture.png"); git("commit", "--quiet", "-m", "Remove local report");
    assert.deepEqual(checkTracked(root).findings, []);
    assert.ok(checkHistory(root).findings.includes("Reachable history private configuration file: artifacts/capture.png"));
  });
});

test("reviewed public image assets remain eligible for publication", () => {
  fixture((root, git) => {
    mkdirSync(path.join(root, "public", "brand"), { recursive: true });
    writeFileSync(path.join(root, "public", "brand", "logo.png"), Buffer.from([0, 1, 2, 3]));
    git("add", "public/brand/logo.png");
    assert.deepEqual(checkTracked(root).findings, []);
  });
});

test("a clean working copy cannot hide a staged key and oversized text is inspected", () => {
  fixture((root, git) => {
    const key = "thk_" + "live_" + "synthetic".repeat(5);
    const file = path.join(root, "report.md");
    writeFileSync(file, "a".repeat(2_100_000) + "\n" + key);
    git("add", "report.md");
    writeFileSync(file, "Redacted working copy\n");
    const result = checkTracked(root);
    assert.ok(result.findings.some((finding: string) => finding.startsWith("Index potential embedded")));
    assert.ok(result.findings.every((finding: string) => !finding.includes(key)));
    const cli = spawnSync(process.execPath, [path.resolve("scripts/check-secrets.mjs")], { cwd: root, encoding: "utf8" });
    assert.equal(cli.status, 1);
    assert.ok(!cli.stdout.includes(key) && !cli.stderr.includes(key));
  });
});

test("history detects deleted env and private aliases of an already-seen blob", () => {
  fixture((root, git) => {
    writeFileSync(path.join(root, "notes.txt"), "SYNTHETIC=value\n");
    git("add", "notes.txt"); git("commit", "--quiet", "-m", "Safe filename");
    writeFileSync(path.join(root, ".env"), "SYNTHETIC=value\n");
    git("add", ".env"); git("commit", "--quiet", "-m", "Private alias");
    git("rm", "--quiet", ".env"); git("commit", "--quiet", "-m", "Remove private alias");
    assert.deepEqual(checkTracked(root).findings, []);
    assert.ok(checkHistory(root).findings.some((finding: string) => finding.includes("private configuration file: .env")));
  });
});

test("embedded keys and auth secret literals fail without logging their values", () => {
  fixture((root, git) => {
    const samples = ["github_" + "pat_" + "synthetic".repeat(6), "sb_" + "secret_" + "synthetic".repeat(4), "-----BEGIN " + "PRIVATE KEY-----", ["AUTH_", "SECRET"].join("") + "=" + JSON.stringify("synthetic-private-value")];
    writeFileSync(path.join(root, "fixture.txt"), samples.join("\n")); git("add", "fixture.txt");
    const result = checkTracked(root);
    assert.equal(result.findings.filter((finding: string) => finding.startsWith("Index potential embedded")).length, samples.length);
    assert.ok(result.findings.every((finding: string) => !finding.includes("synthetic-private-value")));
  });
});

test("env source modules and historical removed markers are not credential files", () => {
  fixture((root, git) => {
    const keyName = ["LLM_", "API_KEY"].join("");
    writeFileSync(path.join(root, "lib-env.ts"), `const value = process.env.${keyName};\n`);
    writeFileSync(path.join(root, "redacted.txt"), `${keyName}='process.env.${keyName} ?? ""'\n`);
    git("add", "lib-env.ts", "redacted.txt");
    assert.deepEqual(checkTracked(root).findings, []);
  });
});

test("installed commit hook blocks a private file before a commit is created", () => {
  fixture((root, git) => {
    mkdirSync(path.join(root, "scripts"));
    mkdirSync(path.join(root, ".githooks"));
    copyFileSync("scripts/check-secrets.mjs", path.join(root, "scripts/check-secrets.mjs"));
    copyFileSync(".githooks/pre-commit", path.join(root, ".githooks/pre-commit"));
    git("config", "core.hooksPath", ".githooks");
    git("add", "scripts/check-secrets.mjs", ".githooks/pre-commit");
    git("update-index", "--chmod=+x", ".githooks/pre-commit");
    git("commit", "--quiet", "-m", "Safe commit passes the hook");
    const before = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    writeFileSync(path.join(root, ".env"), "UNKNOWN_KEY=synthetic-private-value\n");
    git("add", ".env");
    const rejected = spawnSync("git", ["commit", "-m", "Must be rejected"], { cwd: root, encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), before);
    assert.ok(!rejected.stdout.includes("synthetic-private-value") && !rejected.stderr.includes("synthetic-private-value"));
  });
});

test("Windows UTF-16 reports cannot hide recognizable credentials as binary files", () => {
  fixture((root, git) => {
    const key = "thk_" + "live_" + "synthetic".repeat(5);
    const content = Buffer.from(key, "utf16le");
    writeFileSync(path.join(root, "little-endian.md"), Buffer.concat([Buffer.from([0xff, 0xfe]), content]));
    writeFileSync(path.join(root, "big-endian.md"), Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(content).swap16()]));
    git("add", "little-endian.md", "big-endian.md");
    const result = checkTracked(root);
    assert.equal(result.findings.filter((finding: string) => finding.startsWith("Index potential embedded")).length, 2);
    assert.ok(result.findings.every((finding: string) => !finding.includes(key)));
  });
});

test("hook installation preserves an existing hook directory", () => {
  fixture((root, git) => {
    git("config", "core.hooksPath", "existing-hooks");
    const install = spawnSync(process.execPath, [path.resolve("scripts/install-security-hooks.mjs")], { cwd: root, encoding: "utf8" });
    assert.equal(install.status, 1);
    assert.equal(execFileSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), "existing-hooks");
  });
});

test("push hook refuses deleted private env history before updating a local remote", () => {
  fixture((root, git) => {
    mkdirSync(path.join(root, "scripts"));
    mkdirSync(path.join(root, ".githooks"));
    copyFileSync("scripts/check-secrets.mjs", path.join(root, "scripts/check-secrets.mjs"));
    copyFileSync(".githooks/pre-push", path.join(root, ".githooks/pre-push"));
    git("config", "core.hooksPath", ".githooks");
    git("add", "scripts/check-secrets.mjs", ".githooks/pre-push");
    git("update-index", "--chmod=+x", ".githooks/pre-push");
    git("commit", "--quiet", "-m", "Safe initial fixture");
    git("init", "--bare", "--quiet", "remote.git");
    git("push", "--quiet", "./remote.git", "HEAD:refs/heads/main");
    const before = execFileSync("git", ["--git-dir=remote.git", "rev-parse", "refs/heads/main"], { cwd: root, encoding: "utf8" }).trim();
    writeFileSync(path.join(root, ".env"), "ANY_FORMAT=synthetic-private-value\n");
    git("add", ".env"); git("commit", "--quiet", "-m", "Historical exposure fixture");
    git("rm", "--quiet", ".env"); git("commit", "--quiet", "-m", "Clean current tree");
    assert.deepEqual(checkTracked(root).findings, []);
    const rejected = spawnSync("git", ["push", "./remote.git", "HEAD:refs/heads/main"], { cwd: root, encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.equal(execFileSync("git", ["--git-dir=remote.git", "rev-parse", "refs/heads/main"], { cwd: root, encoding: "utf8" }).trim(), before);
    assert.ok(!rejected.stdout.includes("synthetic-private-value") && !rejected.stderr.includes("synthetic-private-value"));
  });
});

test("push scanner checks an explicit outgoing SHA even outside reachable branch history", () => {
  fixture((root, git) => {
    writeFileSync(path.join(root, "notes.txt"), "Safe initial content\n");
    git("add", "notes.txt"); git("commit", "--quiet", "-m", "Safe branch");
    const clean = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    writeFileSync(path.join(root, ".env"), "ANY_FORMAT=synthetic-private-value\n");
    git("add", ".env"); git("commit", "--quiet", "-m", "Orphaned exposure fixture");
    const exposed = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    git("reset", "--hard", clean);
    assert.deepEqual(checkHistory(root).findings, []);
    const outgoing = spawnSync(process.execPath, [path.resolve("scripts/check-secrets.mjs"), "--history", "--push"], { cwd: root, encoding: "utf8", input: `${exposed} ${exposed} refs/heads/fixture ${"0".repeat(40)}\n` });
    assert.equal(outgoing.status, 1);
    assert.ok(outgoing.stderr.includes("private configuration file: .env"));
    assert.ok(!outgoing.stdout.includes("synthetic-private-value") && !outgoing.stderr.includes("synthetic-private-value"));
  });
});


test("retired simulation outputs and operational helpers cannot be force-added again", () => {
  fixture((root, git) => {
    copyFileSync(".gitignore", path.join(root, ".gitignore"));
    const paths = [".sim-prog.json", "simulasi-e2e/results.json", "scripts-e2e/debug.js", "scripts/get-cookie-check.ps1"];
    for (const file of paths) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), "synthetic local output\n");
      git("add", "--force", "--", file);
    }
    const result = checkTracked(root);
    for (const file of paths) assert.ok(result.findings.includes(`Ignored file still tracked: ${file}`));
  });
});
