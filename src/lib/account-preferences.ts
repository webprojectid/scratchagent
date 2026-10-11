import { z } from "zod";

const shortText = z.string().trim().max(120).refine(value => !/[\x00-\x1f]/.test(value));
export const profileSettingsSchema = z.object({
  profession: shortText.default(""), company: shortText.default(""),
  avatar: z.enum(["initials", "sprout", "layers", "code", "orbit", "bolt"]).default("initials"),
});
export const displaySettingsSchema = z.object({
  colorStyle: z.enum(["scratch", "blue", "violet", "amber", "rose"]).default("scratch"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  motion: z.enum(["system", "reduced"]).default("system"),
  badgeMotion: z.enum(["system", "animated", "reduced"]).default("system"),
  defaultFilter: z.enum(["all", "active", "done"]).default("all"),
  language: z.enum(["id", "en"]).default("en"),
  timezone: z.string().max(80).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }).default("Asia/Jakarta"),
  textSize: z.enum(["standard", "large"]).default("standard"),
});
export const handoffSettingsSchema = z.object({
  language: z.enum(["id", "en"]).default("en"),
  stack: z.object({ frontend: shortText.default(""), backend: shortText.default(""), database: shortText.default(""), deployment: shortText.default("") }).default({ frontend: "", backend: "", database: "", deployment: "" }),
  scope: z.enum(["mvp", "production"]).default("mvp"),
  detail: z.enum(["standard", "detailed"]).default("detailed"),
  exportFormat: z.enum(["md", "json", "zip"]).default("zip"),
  agent: z.enum(["generic", "claude", "codex", "cursor", "opencode"]).default("generic"),
});
export const notificationSettingsSchema = z.object({
  generationComplete: z.boolean().default(true), generationFailed: z.boolean().default(true),
  agentBlocked: z.boolean().default(true), checkpoint: z.boolean().default(true), planExpiry: z.boolean().default(true),
});
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type DisplaySettings = z.infer<typeof displaySettingsSchema>;
export type HandoffSettings = z.infer<typeof handoffSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export const defaultProfile = profileSettingsSchema.parse({});
export const defaultDisplay = displaySettingsSchema.parse({});
export const defaultHandoff = handoffSettingsSchema.parse({});
export const legacyHandoff: HandoffSettings = { ...defaultHandoff, language: "id" };
export const defaultNotifications = notificationSettingsSchema.parse({});
export type AccountSettings = { profile: ProfileSettings; display: DisplaySettings; handoff: HandoffSettings; notifications: NotificationSettings };
export const defaultAccountSettings: AccountSettings = { profile: defaultProfile, display: defaultDisplay, handoff: defaultHandoff, notifications: defaultNotifications };
export const accountSettingsPatchSchema = z.object({
  profile: profileSettingsSchema.optional(), display: displaySettingsSchema.optional(),
  handoff: handoffSettingsSchema.optional(), notifications: notificationSettingsSchema.optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export function resolveHandoff(defaults: HandoffSettings, override?: Partial<HandoffSettings>): HandoffSettings {
  return handoffSettingsSchema.parse({ ...defaults, ...override, stack: { ...defaults.stack, ...override?.stack } });
}
export function handoffInstructions(settings: HandoffSettings): string {
  return `OUTPUT CONTRACT:\nWrite all narrative, requirements, feature descriptions and tasks in ${settings.language === "en" ? "English (US)" : "Indonesian"}; preserve JSON field names, user-provided brand names, and technical terms.\nScope: ${settings.scope === "mvp" ? "MVP: prioritize the smallest usable end-to-end product, explicitly defer optional scope." : "Production: include rollout, observability, backups, security, failure recovery and operations."}\nDepth: ${settings.detail === "detailed" ? "detailed implementation context with edge cases and verifiable outcomes" : "concise, concrete implementation context"}.\nTarget coding agent: ${settings.agent}.\nRegardless of depth, preserve functional and nonfunctional requirements, acceptance criteria, dependencies, and verification tasks. Never omit these essentials. Prefer the requested scope when earlier stylistic instructions conflict.`;
}
export function effectiveTechPrefs(explicit: { mode: "auto" | "custom"; frontend?: string; backend?: string; database?: string; deployment?: string }, settings: HandoffSettings) {
  if (explicit.mode === "custom") return explicit;
  const chosen = Object.fromEntries(Object.entries(settings.stack).filter(([, value]) => value.trim()));
  return Object.keys(chosen).length ? { ...chosen, mode: "custom" as const } : explicit;
}
