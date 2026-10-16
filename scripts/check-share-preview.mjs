import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const origin = new URL(process.argv[2] ?? "http://localhost:3137").origin;
const site = "https://www.scratchagent.web.id";
const imagePath = "/social/scratch-agent-share-v3.jpg";
const siteDescription = "Turn your idea into a clear plan, PRD, and actionable tasks.";
const agents = ["Mozilla/5.0", "Twitterbot/1.0", "facebookexternalhit/1.1", "meta-externalagent/1.1", "WhatsApp/2.24.0", "LinkedInBot/1.0", "redditbot/1.0"];

const meta = (head, key) => [...head.matchAll(/<meta\b[^>]*>/g)]
  .map(match => match[0])
  .filter(tag => tag.includes(`property="${key}"`) || tag.includes(`name="${key}"`))
  .map(tag => tag.match(/content="([^"]*)/)?.[1]?.replaceAll("&amp;", "&"));

async function checkPage(path, agent) {
  const response = await fetch(origin + path, { headers: { "user-agent": agent }, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: HTTP status`);
  const html = await response.text();
  const head = html.slice(0, html.indexOf("</head>"));
  assert.deepEqual(meta(head, "og:image"), [site + imagePath], `${path}: single branded OG image in head`);
  assert.deepEqual(meta(head, "twitter:image"), [site + imagePath], `${path}: single branded Twitter image`);
  assert.deepEqual(meta(head, "og:image:secure_url"), [site + imagePath]);
  assert.deepEqual(meta(head, "og:image:type"), ["image/jpeg"]);
  assert.deepEqual(meta(head, "og:image:width"), ["1200"]);
  assert.deepEqual(meta(head, "og:image:height"), ["630"]);
  assert.deepEqual(meta(head, "twitter:card"), ["summary_large_image"]);
  const pathname = new URL(path, site).pathname;
  if (pathname === "/") {
    for (const key of ["description", "og:description", "twitter:description"]) {
      assert.deepEqual(meta(head, key), [siteDescription], `${path}: approved description for ${key}`);
    }
  }
  const canonical = head.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]*)/)?.[1];
  assert.equal(new URL(canonical).href, new URL(pathname, site).href, `${path}: canonical URL`);
  assert.equal(new URL(meta(head, "og:url")[0]).href, new URL(pathname, site).href, `${path}: OG URL`);
  assert.ok(head.includes(`rel="image_src" href="${site + imagePath}"`), "legacy image hint");
  console.log(`${agent} ${path}: branded share metadata passed`);
}

try {
  for (const agent of agents) await checkPage("/", agent);
  await checkPage("/pricing", agents[2]);
  const response = await fetch(origin + imagePath, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type")?.startsWith("image/jpeg"));
  const bytes = Buffer.from(await response.arrayBuffer());
  const expected = readFileSync(new URL("../public" + imagePath, import.meta.url));
  const hash = value => createHash("sha256").update(value).digest("hex");
  assert.equal(hash(bytes), hash(expected), "hosted image matches the selected brand asset");
  for (const path of ["/opengraph-image.jpg", "/twitter-image.jpg", "/social/scratch-agent-share-v2.jpg"]) {
    const legacy = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
    assert.equal(legacy.status, 200, "legacy image URLs remain accessible");
    const legacyBytes = Buffer.from(await legacy.arrayBuffer());
    const legacyExpected = readFileSync(new URL("../public" + path, import.meta.url));
    assert.equal(hash(legacyBytes), hash(legacyExpected), "legacy image URL serves the current revised artwork");
  }
  console.log(`Share image and legacy URLs passed; image size ${bytes.length} bytes.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
