ALTER TABLE "users" DROP CONSTRAINT "users_company_id_email_unique";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");