async function main() {
  const baseUrl = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  const apiKey = process.env.LLM_API_KEY || "";

  // List all models with "qd/", "ds/", "test/" or whatever prefixes are active
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  const allIds: string[] = (data.data || []).map((m: any) => m.id);
  console.log("Total models in proxy:", allIds.length);
  
  // Test each prefix to find all active working models
  for (const id of allIds) {
    if (!id.includes("qwen") && !id.includes("deepseek") && !id.includes("kimi") && !id.includes("38max") && !id.includes("flash") && !id.includes("code") && !id.includes("pro") && !id.includes("minimax") && !id.includes("glm")) continue;
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: id,
          messages: [{ role: "user", content: "Halo" }],
          max_tokens: 5,
        }),
      });
      const txt = await resp.text();
      if (resp.ok) {
        console.log(`[WORKING MODEL] "${id}" (HTTP ${resp.status}) -> length: ${txt.length}`);
      } else {
        console.log(`[INACTIVE] "${id}" -> HTTP ${resp.status}: ${txt.substring(0, 70)}`);
      }
    } catch (e: any) {
      console.log(`[ERROR] "${id}": ${e.message}`);
    }
  }
}

main().catch(console.error);
