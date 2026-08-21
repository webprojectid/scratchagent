async function main() {
  const baseUrl = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  const apiKey = process.env.LLM_API_KEY || "";

  const candidates = [
    "buatprem/deepseek-v4-flash",
    "buatprem/kimi-k2.7-code",
    "buatprem/qwen3.7-max",
    "buatprem/kimi-k3",
    "qd/dfmodel",
    "qd/dmodel",
    "qd/kmodel",
    "qd/qmodel",
    "qd/qmodel_38max"
  ];

  console.log("=== PENGUJIAN MODEL PRESET ===");
  for (const m of candidates) {
    const t0 = Date.now();
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "user", content: "Halo, balas 'OK' saja." }],
          max_tokens: 10,
        }),
      });
      const t1 = Date.now();
      const txt = await resp.text();
      if (resp.ok) {
        console.log(`✓ [READY] "${m}" -> ${t1 - t0}ms`);
      } else {
        console.log(`✗ [ERROR] "${m}" HTTP ${resp.status} -> ${txt.substring(0, 80)}`);
      }
    } catch (e: any) {
      console.log(`✗ [FAIL] "${m}": ${e.message}`);
    }
  }
}

main().catch(console.error);
