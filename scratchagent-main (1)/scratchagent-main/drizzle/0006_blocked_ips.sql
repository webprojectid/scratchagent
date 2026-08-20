ALTER TABLE "security_events" ADD COLUMN "dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "blocked_ips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"blocked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "blocked_ips_ip_unique" UNIQUE("ip")
);
