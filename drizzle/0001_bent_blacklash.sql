ALTER TABLE "tasks" DROP CONSTRAINT "tasks_ref_unique";--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "sub_features" ADD COLUMN "tujuan" text;--> statement-breakpoint
ALTER TABLE "sub_features" ADD COLUMN "selesai_bila" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_ref_unique" UNIQUE("plan_id","ref");