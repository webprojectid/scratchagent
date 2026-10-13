import { apiText } from "./ui-messages";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Agent } from "undici";
// ============================================================
// Anti-SSRF: denylist alamat internal berbasis net.BlockList
// ============================================================

/**
 * Kenapa pakai net.BlockList dan bukan denylist string sendiri:
 * versi sebelumnya (isPrivateIp) melewatkan banyak bentuk alamat internal,
 * sehingga penyerang bisa menembus validasi lewat:
 *   http://0.0.0.0:port, http://0:port, http://[::ffff:7f00:1]:port,
 *   http://[fc00::1]:port, http://[fe80::1]:port, http://255.255.255.255:port
 * BlockList membandingkan alamat secara numerik (bukan string), jadi semua
 * notasi aneh di-normalisasi lebih dulu sebelum dicek.
 */
function buildInternalBlocklist(): BlockList {
  const bl = new BlockList();

  // --- IPv4: loopback, privat, link-local, reserved, multicast ---
  bl.addSubnet("0.0.0.0", 8, "ipv4");          // "this network" (termasuk 0.0.0.0)
  bl.addSubnet("10.0.0.0", 8, "ipv4");         // RFC1918
  bl.addSubnet("100.64.0.0", 10, "ipv4");      // CGNAT (RFC6598) — sering jadi jaringan internal cloud
  bl.addSubnet("127.0.0.0", 8, "ipv4");        // loopback
  bl.addSubnet("169.254.0.0", 16, "ipv4");     // link-local + cloud metadata (169.254.169.254)
  bl.addSubnet("172.16.0.0", 12, "ipv4");      // RFC1918
  bl.addSubnet("192.0.0.0", 24, "ipv4");       // IETF protocol assignments
  bl.addSubnet("192.0.2.0", 24, "ipv4");       // TEST-NET-1
  bl.addSubnet("192.168.0.0", 16, "ipv4");     // RFC1918
  bl.addSubnet("198.18.0.0", 15, "ipv4");      // benchmarking
  bl.addSubnet("198.51.100.0", 24, "ipv4");    // TEST-NET-2
  bl.addSubnet("203.0.113.0", 24, "ipv4");     // TEST-NET-3
  bl.addSubnet("224.0.0.0", 4, "ipv4");        // multicast
  bl.addSubnet("240.0.0.0", 4, "ipv4");        // reserved / future use
  bl.addAddress("255.255.255.255", "ipv4");    // broadcast

  // --- IPv6: loopback, ULA, link-local, multicast, reserved ---
  bl.addSubnet("::", 128, "ipv6");             // unspecified
  bl.addSubnet("::1", 128, "ipv6");            // loopback
  bl.addSubnet("64:ff9b::", 96, "ipv6");       // NAT64 well-known prefix
  bl.addSubnet("64:ff9b:1::", 48, "ipv6");     // NAT64 local-use
  bl.addSubnet("100::", 64, "ipv6");           // discard-only
  bl.addSubnet("2001:db8::", 32, "ipv6");      // dokumentasi
  bl.addSubnet("fc00::", 7, "ipv6");           // Unique Local Address (fc00::/7)
  bl.addSubnet("fe80::", 10, "ipv6");          // link-local
  bl.addSubnet("ff00::", 8, "ipv6");           // multicast

  return bl;
}

let blocklistCache: BlockList | null = null;
function getBlocklist(): BlockList {
  if (!blocklistCache) blocklistCache = buildInternalBlocklist();
  return blocklistCache;
}

/**
 * Normalisasi literal IP ke bentuk kanonik sebelum dicek ke BlockList.
 *
 * Menangani bypass yang sebelumnya lolos:
 * - IPv4-mapped IPv6:  ::ffff:7f00:1  ->  127.0.0.1   (dicek sebagai ipv4)
 * - IPv4-mapped dotted: ::ffff:127.0.0.1 -> 127.0.0.1
 * - zone id: fe80::1%eth0 -> fe80::1
 * Return null jika bukan literal IP (berarti hostname yang perlu di-resolve).
 */
function normalizeIpLiteral(raw: string): { ip: string; type: "ipv4" | "ipv6" } | null {
  const h = raw.trim().replace(/%[0-9a-z]+$/i, "").toLowerCase();
  if (!h) return null;

  // ::ffff:<hex>:<hex>  (mis. ::ffff:7f00:1)
  const mappedHex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    const ip = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return { ip, type: "ipv4" };
  }

  // ::ffff:<dotted-quad>  (mis. ::ffff:127.0.0.1)
  const mappedDotted = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedDotted) return { ip: mappedDotted[1], type: "ipv4" };

  // Bentuk IPv4 tak standar (127.1, 2130706433, 0177.0.0.1) — isIP() menolak
  // ini, tapi getaddrinfo menerimanya. Biarkan jatuh ke jalur DNS di bawah.
  const family = isIP(h);
  if (family === 4) return { ip: h, type: "ipv4" };
  if (family === 6) return { ip: h, type: "ipv6" };
  return null;
}

/** Hostname yang layak di-resolve: hanya karakter DNS yang sah. */
const VALID_HOSTNAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.?$/;

/**
 * Cek satu host (literal IP atau nama domain) terhadap denylist internal.
 * Nama domain di-resolve dan SEMUA alamat hasil resolve dicek, sehingga
 * bentuk aneh seperti http://0:port / http://2130706433:port ikut tertangkap
 * (getaddrinfo menormalisasi keduanya menjadi alamat loopback/unspecified).
 */
async function assertHostIsPublic(host: string): Promise<string | null> {
  const literal = normalizeIpLiteral(host);
  if (literal) {
    if (getBlocklist().check(literal.ip, literal.type)) {
      return `Alamat internal tidak diizinkan: ${host}`;
    }
    return null;
  }

  if (!VALID_HOSTNAME.test(host)) {
    return `Format hostname tidak valid: ${host}`;
  }

  let records;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    return `Domain tidak dapat di-resolve: ${host}`;
  }
  if (!records.length) return `Domain tidak memiliki alamat: ${host}`;

  for (const r of records) {
    const norm = normalizeIpLiteral(r.address);
    const type = r.family === 6 ? "ipv6" : "ipv4";
    if (norm && getBlocklist().check(norm.ip, norm.type)) {
      return `Domain mengarah ke alamat internal: ${host} -> ${r.address}`;
    }
    if (!norm && getBlocklist().check(r.address, type)) {
      return `Domain mengarah ke alamat internal: ${host} -> ${r.address}`;
    }
  }
  return null;
}

/** Hostname yang dipakai layanan metadata cloud — diblok apa pun hasil resolve-nya. */
const BLOCKED_HOST_KEYWORDS = [
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata.azure",
  "imds",
];

/**
 * Validasi baseUrl sebelum dipakai fetch (anti-SSRF).
 *
 * Aturan:
 * 1. Hanya http/https; production wajib https.
 * 2. Tanpa userinfo di URL (http://user@internal-host/).
 * 3. Hostname dinormalisasi (buang kurung IPv6, tangani IPv4-mapped).
 * 4. Literal IP maupun hasil resolve DNS dicek terhadap denylist internal.
 * 5. Nama layanan metadata cloud diblokir eksplisit.
 * 6. Redirect ditolak di sisi fetch (redirect: "error").
 */
export async function validateProviderUrl(
  raw: string,
): Promise<{ ok: true; url: URL } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: apiText("baseUrl bukan URL yang valid.") };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: apiText("Protocol tidak diizinkan (hanya http/https).") };
  }
  if (url.protocol === "http:" && process.env.NODE_ENV === "production") {
    return { ok: false, error: apiText("Di production hanya https yang diizinkan.") };
  }
  if (url.username || url.password) {
    return { ok: false, error: apiText("URL dengan credentials (user:pass@host) tidak diizinkan.") };
  }

  // url.hostname untuk IPv6 sudah tanpa kurung di Node, tapi tetap bersihkan
  // demi keamanan bila runtime berperilaku berbeda.
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().trim();
  if (!host) return { ok: false, error: apiText("Hostname kosong.") };

  if (BLOCKED_HOST_KEYWORDS.some((k) => host === k || host.endsWith("." + k))) {
    return { ok: false, error: apiText("Hostname layanan metadata internal tidak diizinkan.") };
  }

  const blocked = await assertHostIsPublic(host);
  if (blocked) return { ok: false, error: blocked };

  return { ok: true, url };
}

export async function publicProviderFetch(raw: string, init: RequestInit): Promise<Response> {
  const checked = await validateProviderUrl(raw);
  if (!checked.ok) throw new Error(checked.error);
  const host = checked.url.hostname.replace(/^\[|\]$/g, "");
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(record => { const normalized = normalizeIpLiteral(record.address); return normalized ? getBlocklist().check(normalized.ip, normalized.type) : getBlocklist().check(record.address, record.family === 6 ? "ipv6" : "ipv4"); })) throw new Error("Provider resolved to a private address.");
  const dispatcher = new Agent({ connect: { lookup: (_host, options, callback) => {
    if (options.all) callback(null, records);
    else callback(null, records[0].address, records[0].family);
  } } });
  try {
    const response = await fetch(checked.url, { ...init, redirect: "error", dispatcher } as RequestInit);
    if (!response.body) { await dispatcher.close(); return response; }
    const reader = response.body.getReader();
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try { const item = await reader.read(); if (item.done) { controller.close(); await dispatcher.close(); } else controller.enqueue(item.value); }
        catch (error) { controller.error(error); await dispatcher.destroy(); }
      },
      async cancel(reason) { await reader.cancel(reason); await dispatcher.destroy(); },
    });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) { await dispatcher.destroy(); throw error; }
}
