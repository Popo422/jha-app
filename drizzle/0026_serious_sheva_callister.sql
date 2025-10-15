ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-10-15T03:41:57.831Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "end_date" date;