import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  completedBy: text('completed_by').notNull(),
  date: text('date').notNull(), // Date from the form (YYYY-MM-DD format)
  dateTimeClocked: timestamp('date_time_clocked'), // Combined date/time when clocked in/out
  company: text('company').notNull(),
  jobSite: text('job_site').notNull(),
  submissionType: text('submission_type').notNull(), // 'end-of-day', 'job-hazard-analysis', 'start-of-day'
  formData: jsonb('form_data').notNull(), // Store the entire form as JSON including file paths
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})