CREATE TABLE "form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"modules" jsonb NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_by_name" text NOT NULL,
	"is_default" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_templates_company_id_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-08-15T07:47:57.170Z"}'::jsonb;