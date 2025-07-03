ALTER TABLE "companies" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'contractor' NOT NULL;
ALTER TABLE "users" ADD COLUMN "company_id" uuid;