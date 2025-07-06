ALTER TABLE "timesheets" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "approved_by_name" text;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "rejection_reason" text;