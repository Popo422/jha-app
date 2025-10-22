CREATE TABLE "change_order_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_order_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'Supporting Document' NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"url" text NOT NULL,
	"blob_key" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"change_type" text NOT NULL,
	"original_contract_amount" numeric(12, 2),
	"new_amount" numeric(12, 2),
	"cost_difference" numeric(12, 2),
	"added_days" integer DEFAULT 0,
	"original_end_date" date,
	"revised_end_date" date,
	"requested_by" text NOT NULL,
	"requested_by_user_id" uuid,
	"submission_date" timestamp DEFAULT now() NOT NULL,
	"notes_or_justification" text,
	"to_be_approved_by" text,
	"to_be_approved_by_user_ids" jsonb DEFAULT '[]'::jsonb,
	"key_stakeholder" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"assigned_approver_id" uuid,
	"assigned_approver_name" text,
	"approver_signature" text,
	"date_approved" timestamp,
	"date_rejected" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "change_orders_project_id_title_unique" UNIQUE("project_id","title")
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "membership_info" SET DEFAULT '{"membershipLevel":"3","user":null,"memberships":[],"tokenVerifiedAt":"2025-10-22T12:45:11.715Z"}'::jsonb;--> statement-breakpoint
ALTER TABLE "change_order_documents" ADD CONSTRAINT "change_order_documents_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_documents" ADD CONSTRAINT "change_order_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;