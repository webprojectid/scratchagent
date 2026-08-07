import type { Plan } from "./types";

export function renderPrdMd(plan: Plan): string {
  let md = `# PRD — Project Requirements Document\n\n## 1. Overview\n${plan.brief}\n\n## 2. Requirements\n`;

  if (plan.requirements) {
    md += `\n### Fungsional\n${plan.requirements.fungsional.map((r) => `- ${r}`).join("\n")}\n`;
    md += `\n### Non-Fungsional\n${plan.requirements.nonFungsional.map((r) => `- ${r}`).join("\n")}\n`;
  }

  md += `\n### Asumsi\n${plan.asumsi.map((a) => `- ${a}`).join("\n")}\n`;

  md += `\n## 3. Core Features\n`;
  const faseMap = new Map<number, typeof plan.features>();
  for (const f of plan.features) {
    const phases = f.subFeatures.flatMap((sf) => sf.tasks.map((t) => t.phase));
    const minPhase = phases.length ? Math.min(...phases) : 1;
    if (!faseMap.has(minPhase)) faseMap.set(minPhase, []);
    faseMap.get(minPhase)!.push(f);
  }
  for (const fase of [...faseMap.keys()].sort((a, b) => a - b)) {
    md += `\n### Fase ${fase}\n`;
    for (const f of faseMap.get(fase)!) {
      const priority = f.priority ? ` [${f.priority}]` : "";
      md += `\n**${f.title}**${priority} — ${f.description}\n`;
      for (const sf of f.subFeatures) {
        md += `- **${sf.title}**\n`;
      }
    }
  }

  if (plan.userFlow?.length) {
    md += `\n## 4. User Flow\n`;
    for (const flow of plan.userFlow) {
      md += `\n### ${flow.title}\n`;
      flow.steps.forEach((step, i) => { md += `${i + 1}. ${step}\n`; });
    }
  }

  if (plan.architecture) {
    md += `\n## 5. Architecture\n${plan.architecture}\n`;
  }
  if (plan.databaseSchema) {
    md += `\n## 6. Database Schema\n${plan.databaseSchema}\n`;
  }

  md += `\n## 7. Tech Stack\n`;
  if (plan.techStack?.length) {
    md += plan.techStack.map((t) => `- **${t.name}** — ${t.desc}`).join("\n") + "\n";
  } else {
    md += plan.stack.map((s) => `- **${s}**`).join("\n") + "\n";
  }
  return md;
}

export function renderFeatureMd(feature: Plan["features"][0]): string {
  let md = `# ${feature.title}\n\n${feature.description}\n\n## Spesifikasi\n\n### Tujuan\n${feature.tujuan}\n\n### Selesai bila\n${feature.selesaiBila.map((s) => `- ${s}`).join("\n")}\n`;
  for (const s of feature.subFeatures) {
    md += `\n## Sub-fitur: ${s.title}\n`;
    if (s.tujuan) md += `\n### Tujuan\n${s.tujuan}\n`;
    if (s.selesaiBila?.length) md += `\n### Selesai bila\n${s.selesaiBila.map((b) => `- ${b}`).join("\n")}\n`;
  }
  md += `\n## Task\n`;
  let taskNum = 1;
  for (const s of feature.subFeatures) {
    for (const t of s.tasks) {
      md += `\n### ${taskNum}. ${t.title}\n`;
      taskNum++;
    }
  }
  return md;
}

export function createZip(plan: Plan): Uint8Array {
  const encoder = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [
    { name: "PRD.md", data: encoder.encode(renderPrdMd(plan)) },
    { name: "struktur.json", data: encoder.encode(JSON.stringify(plan, null, 2)) },
    { name: "README.md", data: encoder.encode(`# ${plan.title}\n\nCara pakai tanpa CLI:\n1. Baca PRD.md\n2. Kerjakan task sesuai urutan di struktur.json\n3. Frontend dulu (di atas stub), lalu backend, lalu QA\n`) },
  ];
  for (const f of plan.features) {
    files.push({ name: `fitur/${f.slug}.md`, data: encoder.encode(renderFeatureMd(f)) });
  }
  return buildZip(files);
}

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = makeLocalHeader(nameBytes, crc, file.data);
    const centralHeader = makeCentralHeader(nameBytes, crc, offset, file.data.length);
    chunks.push(local);
    central.push(centralHeader);
    offset += local.length;
  }

  const centralData = concat(central);
  const endRecord = makeEndRecord(files.length, offset, centralData.length);

  return concat([...chunks, centralData, endRecord]);
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

function makeLocalHeader(name: Uint8Array, crc: number, data: Uint8Array): Uint8Array {
  return concat([
    u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
    u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
    name, data,
  ]);
}

function makeCentralHeader(name: Uint8Array, crc: number, offset: number, size: number): Uint8Array {
  return concat([
    u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
    u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0),
    u16(0), u16(0), u32(0), u32(offset), name,
  ]);
}

function makeEndRecord(count: number, centralOffset: number, centralSize: number): Uint8Array {
  return concat([
    u32(0x06054b50), u16(0), u16(0), u16(count), u16(count),
    u32(centralSize), u32(centralOffset), u16(0),
  ]);
}
