-- Multi-provider LLM: daftar provider failover (base URL + API key + model per provider).
-- Kosong '[]' = mundur ke kolom legacy base_url/api_key/model sebagai satu-satunya provider.
ALTER TABLE "llm_settings" ADD COLUMN IF NOT EXISTS "providers" "jsonb" NOT NULL DEFAULT '[]';