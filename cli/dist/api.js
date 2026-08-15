import { getToken, getBaseUrl } from "./config.js";
export async function api(path, options = {}) {
    const token = getToken();
    if (!token) {
        console.error("Belum login. Jalankan: scratch-agent login --token <token>");
        process.exit(1);
    }
    const url = `${getBaseUrl()}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error(`Error ${res.status}: ${data.error ?? res.statusText}`);
        process.exit(1);
    }
    return data;
}
