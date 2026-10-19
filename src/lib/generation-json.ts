import { jsonrepair } from "jsonrepair";

const objectJson = (value: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? value : null;
  } catch { return null; }
};

/** Embedded SQL/Mermaid fences belong to JSON string values, never to the envelope. */
export function extractGenerationJson(value: string): string {
  const clean = value.trim();
  const whole = objectJson(clean);
  if (whole) return whole;
  const enclosing = clean.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*)\r?\n```$/i);
  const candidates = enclosing ? [enclosing[1].trim(), clean] : [clean];
  // Recover prose-wrapped objects while respecting quotes and nested structures.
  let quoted = false, escaped = false, depth = 0, start = -1;
  for (let index = 0; index < clean.length; index++) {
    const char = clean[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"' && depth) { quoted = true; continue; }
    if (char === "{") { if (depth++ === 0) start = index; }
    else if (char === "}" && depth && --depth === 0) candidates.push(clean.slice(start, index + 1));
  }
  for (const candidate of candidates) {
    const valid = objectJson(candidate);
    if (valid) return valid;
  }
  if (quoted) throw new Error("JSON parsing gagal: respons terpotong di tengah string; request a complete correction instead of inventing its ending.");
  for (const candidate of candidates) {
    try { const repaired = objectJson(jsonrepair(candidate)); if (repaired) return repaired; }
    catch { /* Try the next envelope, never accept a scalar root. */ }
  }
  throw new Error("JSON parsing gagal: respons model tidak membentuk objek JSON yang valid.");
}

export function normalizeGeneratedText(text: string, kind: "code" | "prose" | "mermaid" = "code"): string {
  if (kind === "code") return text.trim();
  if (kind === "prose") return text.replace(/\\r\\n|\\n\\n/g, "\n\n").trim();
  let result = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && text[index - 1] !== "\\") quoted = !quoted;
    if (!quoted && char === "\\" && text[index + 1] === "n") { result += "\n"; index++; }
    else if (!quoted && text.slice(index, index + 4) === "\\r\\n") { result += "\n"; index += 3; }
    else result += char;
  }
  if (/^\s*(?:flowchart|graph)\b/.test(result)) {
    const outsideQuotes = (offset: number): boolean => {
      let open = false;
      for (let index = 0; index < offset; index++) if (result[index] === '"' && result[index - 1] !== "\\") open = !open;
      return !open;
    };
    result = result.replace(/\b([A-Za-z_]\w*)\[([^\[\]\n"]*\|[^\[\]\n"]*)\]/g, (whole, id: string, label: string, offset: number) => label.startsWith("(") || !outsideQuotes(offset) ? whole : `${id}["${label}"]`);
    result = result.replace(/(-->|--o|--x|==>|---|-\.->)\|([^|"\n]*[()][^|"\n]*)\|/g, (whole, arrow: string, label: string, offset: number) => outsideQuotes(offset) ? `${arrow}|"${label}"|` : whole);
  }
  return result.trim();
}
