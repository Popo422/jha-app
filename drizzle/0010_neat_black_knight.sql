CREATE TABLE "supervisors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supervisors_company_id_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-07-28T03:23:27.537Z"}'::jsonb;