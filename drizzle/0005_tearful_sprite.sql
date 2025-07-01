ALTER TABLE "companies" ADD COLUMN "modules_last_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "modules_last_updated_by" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "modules_last_updated_by_user_id" text;