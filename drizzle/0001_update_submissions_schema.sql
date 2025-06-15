-- Rename supervisor_date_clocked_in to date_time_clocked
ALTER TABLE "submissions" RENAME COLUMN "supervisor_date_clocked_in" TO "date_time_clocked";

-- Drop supervisor_date_clocked_out column 
ALTER TABLE "submissions" DROP COLUMN "supervisor_date_clocked_out";

-- Add new date column
ALTER TABLE "submissions" ADD COLUMN "date" text NOT NULL DEFAULT '1970-01-01';