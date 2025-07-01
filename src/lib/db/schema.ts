import { pgTable, text, timestamp, uuid, jsonb, numeric } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  injuryTimerLastReset: timestamp('injury_timer_last_reset').defaultNow(),
  injuryTimerResetBy: text('injury_timer_reset_by'),
  enabledModules: jsonb('enabled_modules').default(['start-of-day', 'end-of-day', 'job-hazard-analysis', 'timesheet']), // Available modules for this company
  modulesLastUpdatedAt: timestamp('modules_last_updated_at'),
  modulesLastUpdatedBy: text('modules_last_updated_by'), // Admin name who last updated modules
  modulesLastUpdatedByUserId: text('modules_last_updated_by_user_id'), // Admin user ID for reference
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  companyId: uuid('company_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  companyId: uuid('company_id').notNull(),
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

export const timesheets = pgTable('timesheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  companyId: uuid('company_id').notNull(),
  date: text('date').notNull(), // Date from the form (YYYY-MM-DD format)
  employee: text('employee').notNull(), // Person's name
  company: text('company').notNull(), // Client company name
  jobSite: text('job_site').notNull(), // Company location
  jobDescription: text('job_description').notNull(), // Information about the job
  timeSpent: numeric('time_spent', { precision: 5, scale: 2 }).notNull(), // Time spent on site
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  companyId: uuid('company_id').notNull(),
  code: text('code').notNull().unique(), // Used for login
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

