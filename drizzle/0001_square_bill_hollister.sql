CREATE TABLE "injury_timer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_reset_time" timestamp DEFAULT now() NOT NULL,
	"reset_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"employee" text NOT NULL,
	"company" text NOT NULL,
	"job_site" text NOT NULL,
	"job_description" text NOT NULL,
	"time_spent" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" RENAME COLUMN "supervisor_date_clocked_in" TO "date_time_clocked";--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "date" text NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "supervisor_date_clocked_out";