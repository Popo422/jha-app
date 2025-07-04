CREATE TABLE "toolbox_talks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"company_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "job_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheets" ALTER COLUMN "job_name" SET NOT NULL;