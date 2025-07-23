CREATE TABLE "toolbox_talk_read_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toolbox_talk_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"read_by" text NOT NULL,
	"date_read" text NOT NULL,
	"signature" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "toolbox_talk_read_entries_toolbox_talk_id_read_by_company_id_unique" UNIQUE("toolbox_talk_id","read_by","company_id")
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-07-22T14:41:04.637Z"}'::jsonb;