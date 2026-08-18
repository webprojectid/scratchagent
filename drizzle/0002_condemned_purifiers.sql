CREATE TABLE "llm_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"base_url" text,
	"api_key" text,
	"model" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
