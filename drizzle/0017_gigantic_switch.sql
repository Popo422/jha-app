ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-09-01T13:00:55.084Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "type" text DEFAULT 'contractor';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "foreman" text;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "subcontractor_id";