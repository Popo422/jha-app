ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-11-11T11:55:35.838Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "date_of_hire" date;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "work_classification" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "project_type" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "group" integer;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "trade" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "contractor_license_no" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "specialty_license_no" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "federal_tax_id" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "motor_carrier_permit_no" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "is_union" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "is_self_insured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "workers_comp_policy" text;