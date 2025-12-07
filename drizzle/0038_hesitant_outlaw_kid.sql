ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-11-16T01:51:17.685Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "state" text;