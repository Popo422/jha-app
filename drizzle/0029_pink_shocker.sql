ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-11-05T13:13:30.702Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "overtime_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "double_time_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "cost" numeric(12, 2);