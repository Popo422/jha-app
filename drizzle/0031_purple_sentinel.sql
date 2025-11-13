ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-11-06T12:51:48.065Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "overtime_hours" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "double_hours" numeric(5, 2) DEFAULT '0.00';