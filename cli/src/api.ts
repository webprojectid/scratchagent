import { getToken, getBaseUrl } from "./config.js";

export async function api(path: string, options: RequestInit = {}): Promise<unknown> {
 const token = getToken();
 if (!token) {
  console.error("Belum login. Jalankan: scratch-agent login --token <token> --url <URL>");
  console.error("Contoh: scratch-agent login --token rv_xxx --url https://www.scratchagent.web.id");
  process.exit(1);
 }

 const base = getBaseUrl();
 if (!base) {
  console.error("URL server Scratch Agent belum diset.");
  console.error("Jalankan ulang login dengan --url, contoh:");
  console.error("  scratch-agent login --token <token> --url https://www.scratchagent.web.id");
  process.exit(1);
 }

 const url = `${base}${path}`;
 let res: Response;
 try {
  res = await fetch(url, {
   ...options,
   headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
   },
  });
 } catch {
  console.error(`Gagal koneksi ke server Scratch Agent: ${base}`);
  console.error("JANGAN mencoba menyala-kan server sendiri atau mencari server lokal.");
  console.error("Periksa koneksi internet, atau jalankan ulang login dengan --url yang benar:");
  console.error("  scratch-agent login --token <token> --url https://www.scratchagent.web.id");
  process.exit(1);
 }

 const data = await res.json().catch(() => ({}));

 if (!res.ok) {
  console.error(`Error ${res.status}: ${(data as { error?: string }).error ?? res.statusText}`);
  process.exit(1);
 }

 return data;
}

