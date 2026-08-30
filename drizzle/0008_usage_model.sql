-- Catat model LLM yang melayani tiap generate (hasil failover, dipisah koma).
ALTER TABLE "usage_events" ADD COLUMN IF NOT EXISTS "model" text;
