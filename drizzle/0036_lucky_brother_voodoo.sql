ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-11-12T01:51:36.360Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_code" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "contract_id" text;