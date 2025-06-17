CREATE TABLE IF NOT EXISTS "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"employee" text NOT NULL,
	"company" text NOT NULL,
	"job_site" text NOT NULL,
	"job_description" text NOT NULL,
	"time_spent" numeric(5,2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);