import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const sources = [
  { name: "tabler", repo: "tabler/tabler-icons", revision: "a4ce1404bc6d24d3c365afe7b258d6bf6f48d62d", prefix: "icons/outline/", names: "activity book boxes brain building calendar camera chart-bar chart-line movie code coffee tools-kitchen-2 database barbell feather fingerprint flag flower focus school heart-handshake heartbeat home layout-kanban key leaf list-check lock luggage map-pin speakerphone messages topology-star-3 notebook planet package package-check palette plane puzzle radio receipt route scan send shield-check shopping-cart plant-2 building-store scissors target telescope terminal truck users tools-kitchen wallet wash-machine route-2 sitemap tool search credit-card cash bell settings user user-check user-plus chart-pie device-mobile device-desktop shopping-bag barcode qrcode clipboard-check cloud-upload cloud-download table file-description files file-export mail message-circle photo video music microphone calendar-event calendar-time calendar-check calendar-cancel calendar-cog repeat coins pig-money receipt-refund currency-dollar file-analytics report-analytics shield-lock adjustments lifebuoy headset world ball-football device-gamepad ticket gauge plug api git-branch test-pipe rocket check list layout-dashboard briefcase heart flask stethoscope certificate trophy".split(" ") },
  { name: "iconoir", repo: "iconoir-icons/iconoir", revision: "962357a0ee20d44acc1dca2383d067feffe67029", prefix: "icons/regular/", names: "wallet calendar user shield-check search settings database cart credit-card bell home task-list journal map box reports dashboard book graph-up key lock fingerprint".split(" ") },
];
const headers = { "User-Agent": "ScratchAgent-icon-stock" };
async function read(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Asset request returned ${response.status}: ${url}`);
  return response.text();
}
const catalog = [];
for (const source of sources) {
  const tree = JSON.parse(await read(`https://api.github.com/repos/${source.repo}/git/trees/${source.revision}?recursive=1`));
  const available = new Set(tree.tree.map(entry => entry.path));
  const names = [...new Set(source.names)].filter(name => available.has(`${source.prefix}${name}.svg`)).sort();
  const missing = source.names.filter(name => !names.includes(name));
  if (missing.length) console.log(`${source.name}: unavailable selections: ${missing.join(", ")}`);
  const folder = `public/icons/${source.name}`;
  await mkdir(folder, { recursive: true });
  const license = await read(`https://raw.githubusercontent.com/${source.repo}/${source.revision}/LICENSE`);
  if (!license.includes("MIT License") && !license.includes("Permission is hereby granted")) throw new Error("Unexpected asset license");
  await writeFile(`${folder}/LICENSE.txt`, license);
  const assets = [];
  for (let index = 0; index < names.length; index += 8) {
    const batch = await Promise.all(names.slice(index, index + 8).map(async name => {
      const svg = await read(`https://raw.githubusercontent.com/${source.repo}/${source.revision}/${source.prefix}${name}.svg`);
      if (!svg.includes("<svg") || /<script|<foreignObject|<!DOCTYPE|<!ENTITY|\bon\w+\s*=|\b(?:href|src)\s*=/i.test(svg)) throw new Error(`Unexpected SVG content: ${name}`);
      await writeFile(`${folder}/${name}.svg`, svg);
      return { name, sha256: createHash("sha256").update(svg).digest("hex"), svg };
    }));
    assets.push(...batch);
  }
  if (source.name === "tabler") {
    const symbols = assets.map(({ name, svg }) => `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</symbol>`);
    await writeFile(`${folder}/sprite.svg`, `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`);
    await writeFile("src/lib/stock-icon-catalog.ts", `// Curated Tabler stock. Source revision and licenses: public/icons/catalog.json.\nexport const stockIconNames = ${JSON.stringify(names, null, 2)} as const;\nexport type StockIconName = typeof stockIconNames[number];\n`);
  }
  catalog.push({ ...source, names: undefined, license: "MIT", licensePath: `/icons/${source.name}/LICENSE.txt`, icons: assets.map(({ name, sha256 }) => ({ name, sha256 })) });
  console.log(`${source.name}: saved ${assets.length} SVG icons`);
}
await writeFile("public/icons/catalog.json", JSON.stringify(catalog, null, 2) + "\n");
