import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".scratch-agent");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  token: string;
  baseUrl: string;
  planId?: string;
}

export function loadConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getToken(): string | null {
  return loadConfig()?.token ?? null;
}

export function getBaseUrl(): string {
  return loadConfig()?.baseUrl ?? process.env.SCRATCH_AGENT_URL ?? "http://localhost:3000";
}
