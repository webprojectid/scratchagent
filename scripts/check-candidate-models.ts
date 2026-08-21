async function main() {
  const baseUrl = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  const apiKey = process.env.LLM_API_KEY || "";

  const candidates = [
    "ds/deepseek-v4-flash",
    "test/xyrz/deepseek-v4-flash",
    "test/xyrz/kimi-k3",
    "test/xyrz/qwen3.7-plus",
    "test/xyrz/qwen3.7-max",
    "ds/deepseek-v4-pro",
    "ds/deepseek-chat",
    "qd/qmodel_38max"
  ];

  console.log("=== PENGUJIAN KONEKSI MODEL DI PROXY ===");
  for (const model of candidates) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Halo, balas 'OK' saja." }],
          max_tokens: 5,
        }),
      });
      const t1 = Date.now();
      if (res.ok) {
        const data = await res.json();
        console.log(`✓ [AKTIF] "${model}" -> ${t1 - t0}ms, response: "${data.choices?.[0]?.message?.content?.trim()}"`);
      } else {
        const err = await res.text();
        console.log(`✗ [ERROR HTTP ${res.status}] "${model}" -> ${err.substring(0, 100)}`);
      }
    } catch (e: any) {
      console.log(`✗ [FAILED] "${model}":`, e.message);
    }
  }
}

main().catch(console.error);
