DROP TABLE "injury_timer" CASCADE;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "injury_timer_last_reset" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "injury_timer_reset_by" text;