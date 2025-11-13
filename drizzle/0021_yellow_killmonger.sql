CREATE TABLE "procore_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"procore_company_id" text NOT NULL,
	"procore_access_token" text NOT NULL,
	"procore_refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sync_settings" jsonb DEFAULT '{}'::jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "procore_integrations_company_id_procore_company_id_unique" UNIQUE("company_id","procore_company_id")
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-10-02T09:43:55.086Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "procore_integrations" ADD CONSTRAINT "procore_integrations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" DROP COLUMN "project_id";