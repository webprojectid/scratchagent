import catalog from "./ui-copy.json";
export type UiLanguage = "id" | "en";
export function apiText(text: string) { return translateUi(text, "en"); }
export function translateActivityTitle(text: string, language: UiLanguage) {
  const completed = text.match(/^Agent menyelesaikan task: (.+)$/);
  const started = text.match(/^Agent mulai mengerjakan task: (.+)$/);
  const failed = text.match(/^Task (.+) gagal dan perlu ditinjau$/);
  if (completed) return language === "en" ? `Completed task ${completed[1]}` : text;
  if (started) return language === "en" ? `Started task ${started[1]}` : text;
  if (failed) return language === "en" ? `Task ${failed[1]} failed and needs review` : text;
  return translateUi(text, language);
}
const entries = new Map<string, { en: string; id: string }>();
for (const [original, english, indonesian] of catalog) {
  const entry = { en: english, id: (indonesian ?? original).replaceAll("&amp;", "&").replaceAll("&gt;", ">").replaceAll("&lt;", "<") };
  entries.set(original, entry);
  if (!entries.has(english)) entries.set(english, entry);
}
export function translateUi(text: string, language: UiLanguage, ...values: (string | number | undefined | null)[]): string {
  const translated = entries.get(text)?.[language] ?? text;
  return values.length ? translated.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? "")) : translated;
}
