CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contractors_email_unique" UNIQUE("email"),
	CONSTRAINT "contractors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "injury_timer" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;