const { readFileSync } = require("fs");
const envPath = process.argv[2] || ".env";
const envText = readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const baseUrl = process.env.LLM_BASE_URL?.replace(/\/$/, "");
const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL;

console.log("Testing:", model);

fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: model,
    messages: [
      { role: "system", content: "Generate a simple project plan in JSON format." },
      { role: "user", content: "Create a lightweight Scratch Agent plan with 3 phases and tasks." }
    ],
    temperature: 0.1,
    max_tokens: 500
  })
}).then(res => res.text())
  .then(text => {
    console.log("Response preview:", text.substring(0, 800));
  })
  .catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
  });
