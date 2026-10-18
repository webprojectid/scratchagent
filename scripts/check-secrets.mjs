import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const patterns = [
  /postgres(?:ql)?:\/\/[^\s"'\x60]+:[^\s"'\x60]+@(?!localhost\b|127\.0\.0\.1\b)[^\s"'\x60]+/,
  /\bsk-[A-Za-z0-9_-]{24,}/,
  /\bsk-[A-Za-z0-9_-]{4,}(?:\.{3}|…)[A-Za-z0-9_-]{4,}/,
  /\bthk_(?:live|test)_[A-Za-z0-9_-]{16,}/,
  /\brv_[a-f0-9]{24,}\b/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sb_secret_[A-Za-z0-9_-]{16,})/,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,
];
const literalAssignment = /["']?\b(?:AUTH_SECRET|LLM_API_KEY|GOOGLE_CLIENT_SECRET|SUPABASE_SERVICE_ROLE_KEY|DB_PASSWORD)["']?\s*[:=]\s*(["'])(.*?)\1/;
const templateDefaults = new Map([["QUOTA_GENERATE_DAILY", "3"]]);

export function isPrivatePath(file) {
  const segments = file.replaceAll("\\", "/").toLowerCase().split("/");
  const name = segments.at(-1);
  const localDirectories = new Set(["artifacts", "output", ".vercel", ".scratch-data", ".roninvibe-data", "__pycache__"]);
  if (segments.slice(0, -1).some(part => localDirectories.has(part) || part.startsWith(".tmp-"))) return true;
  if (/\.(?:har|pyc|pyo)$/.test(name)) return true;
  if (file === ".env.example") return false;
  return /^\.env(?:[._-]|$)/.test(name) || /\.env(?:[._-]|$)/.test(name)
    || name === ".envrc"
    || /\.(?:pem|key|p12|pfx)$/.test(name);
}

function textContent(data) {
  if (data[0] === 0xff && data[1] === 0xfe) return data.subarray(2).toString("utf16le");
  if (data[0] === 0xfe && data[1] === 0xff) return Buffer.from(data.subarray(2)).swap16().toString("utf16le");
  return data.includes(0) ? null : data.toString("utf8");
}

function inspect(file, data, label) {
  const findings = [];
  if (isPrivatePath(file)) findings.push(`${label} private configuration file: ${file}`);
  const text = textContent(data);
  if (text === null) return findings;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const literal = line.match(literalAssignment)?.[2];
    const historicalRedaction = literal && (/^process\.env\.[A-Z_]+(?: \?\? "")?$/.test(literal) || /^REMOVED_EXPOSED_[A-Z_]+$/.test(literal));
    if (patterns.some(pattern => pattern.test(line)) || (literal && !historicalRedaction)) {
      findings.push(`${label} potential embedded credential: ${file}:${index + 1}`);
    }
    if (file !== ".env.example" || !line.trim() || line.trimStart().startsWith("#")) return;
    const assignment = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!assignment) {
      findings.push(`${label} invalid env template entry: ${file}:${index + 1}`);
      return;
    }
    const [, key, raw] = assignment;
    const value = raw.replace(/^(["'])(.*)\1$/, "$2");
    if (value && templateDefaults.get(key) !== value) {
      findings.push(`${label} nonempty env template value: ${file}:${index + 1}`);
    }
  });
  return findings;
}

function git(root, args, options = {}) {
  return execFileSync("git", args, { cwd: root, maxBuffer: 512_000_000, ...options });
}

function readBlobs(root, ids) {
  if (!ids.length) return new Map();
  const batch = git(root, ["cat-file", "--batch"], { input: ids.join("\n") + "\n" });
  const data = new Map();
  let offset = 0;
  for (const oid of ids) {
    const end = batch.indexOf(10, offset);
    const [returnedId, kind, rawSize] = batch.subarray(offset, end).toString().split(" ");
    const size = Number(rawSize);
    if (end < 0 || returnedId !== oid || kind !== "blob" || !Number.isSafeInteger(size)) {
      throw new Error("Cannot read Git blobs");
    }
    data.set(oid, batch.subarray(end + 1, end + 1 + size));
    offset = end + 1 + size + 1;
  }
  return data;
}

export function checkTracked(root = process.cwd()) {
  const records = git(root, ["ls-files", "--stage", "-z"]).toString("utf8").split("\0").filter(Boolean);
  const entries = records.map(record => {
    const tab = record.indexOf("\t");
    const [, oid, stage] = record.slice(0, tab).split(" ");
    return { file: record.slice(tab + 1), oid, stage };
  });
  const findings = [];
  const ignored = git(root, ["ls-files", "-i", "-c", "--exclude-standard", "-z"]).toString("utf8").split("\0").filter(Boolean);
  for (const file of ignored) findings.push(`Ignored file still tracked: ${file}`);
  const blobs = readBlobs(root, [...new Set(entries.map(entry => entry.oid))]);
  for (const { file, oid, stage } of entries) {
    if (stage !== "0") findings.push(`Unresolved index entry: ${file}`);
    findings.push(...inspect(file, blobs.get(oid), "Index"));
    const absolute = path.resolve(root, file);
    if (statSync(absolute, { throwIfNoEntry: false })?.isFile()) {
      findings.push(...inspect(file, readFileSync(absolute), "Working tree"));
    }
  }
  return { findings: [...new Set(findings)], scanned: entries.length };
}

export function checkHistory(root = process.cwd(), outgoingCommits = []) {
  const findings = [];
  // Check each historical tree: identical blobs can also have private filenames.
  const commits = git(root, ["rev-list", "--all", ...outgoingCommits]).toString("utf8").trim().split("\n").filter(Boolean);
  const pathsByBlob = new Map();
  for (const commit of commits) {
    const records = git(root, ["ls-tree", "-r", "-z", commit]).toString("utf8").split("\0").filter(Boolean);
    for (const record of records) {
      const tab = record.indexOf("\t");
      const [, type, oid] = record.slice(0, tab).split(" ");
      if (type !== "blob") continue;
      const file = record.slice(tab + 1);
      if (!pathsByBlob.has(oid)) pathsByBlob.set(oid, new Set());
      pathsByBlob.get(oid).add(file);
    }
  }
  const blobs = readBlobs(root, [...pathsByBlob.keys()]);
  let scanned = 0;
  for (const [oid, names] of pathsByBlob) {
    const data = blobs.get(oid);
    if (textContent(data) !== null) scanned++;
    for (const file of names) findings.push(...inspect(file, data, "Reachable history"));
  }
  return { findings: [...new Set(findings)], scanned };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const historical = process.argv.includes("--history");
    const outgoingCommits = [];
    if (process.argv.includes("--push")) {
      if (!historical) throw new Error("Push mode requires history inspection");
      for (const line of readFileSync(0, "utf8").trim().split("\n").filter(Boolean)) {
        const oid = line.split(/\s+/)[1];
        if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(oid)) throw new Error("Invalid outgoing commit");
        if (!/^0+$/.test(oid)) outgoingCommits.push(oid);
      }
    }
    const result = historical ? checkHistory(process.cwd(), outgoingCommits) : checkTracked();
    result.findings.forEach(finding => console.error(finding));
    console.log(`${historical ? "Reachable history text blobs" : "Tracked entries (index and working tree)"}: ${result.scanned}; findings: ${result.findings.length}. Values are never printed.`);
    process.exitCode = result.findings.length ? 1 : 0;
  } catch {
    console.error("Credential scan failed to inspect the repository. No credential values are printed.");
    process.exitCode = 1;
  }
}
