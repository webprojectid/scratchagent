async function main() {
  const baseUrl = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  const apiKey = process.env.LLM_API_KEY || "";

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("=== DAFTAR MODEL YANG TERSEDIA DI PROXY / LOCAL SERVER ===");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`HTTP ${res.status}:`, await res.text());
    }
  } catch (e: any) {
    console.error("Gagal:", e.message);
  }
}

main().catch(console.error);
