ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-08-15T07:14:08.383Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "enabled_modules" jsonb DEFAULT '["start-of-day","end-of-day","job-hazard-analysis","incident-report","quick-incident-report","near-miss-report","vehicle-inspection","timesheet"]'::jsonb;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "modules_last_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "modules_last_updated_by" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "modules_last_updated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "enabled_modules";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "modules_last_updated_at";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "modules_last_updated_by";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "modules_last_updated_by_user_id";