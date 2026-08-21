async function main() {
  const baseUrl = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  const apiKey = process.env.LLM_API_KEY || "";

  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  const allIds: string[] = (data.data || []).map((m: any) => m.id);

  console.log("=== SEMUA ID MODEL DI PROXY DENGAN KATA KUNCI QWEN, DEEPSEEK, KIMI, FLASH, DLL ===");
  const filtered = allIds.filter(id => 
    id.toLowerCase().includes("qwen") || 
    id.toLowerCase().includes("deepseek") || 
    id.toLowerCase().includes("kimi") || 
    id.toLowerCase().includes("flash") || 
    id.toLowerCase().includes("glm") ||
    id.toLowerCase().includes("minimax") ||
    id.toLowerCase().includes("qd/")
  );
  console.log(filtered);
}

main().catch(console.error);
