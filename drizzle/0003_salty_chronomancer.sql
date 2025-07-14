ALTER TABLE "submissions" RENAME COLUMN "job_name" TO "project_name";--> statement-breakpoint
ALTER TABLE "timesheets" RENAME COLUMN "job_name" TO "project_name";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "job_site";--> statement-breakpoint
ALTER TABLE "timesheets" DROP COLUMN "job_site";