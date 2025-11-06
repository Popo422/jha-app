ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-11-06T09:59:54.415Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "race" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "contact" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "phone" text;