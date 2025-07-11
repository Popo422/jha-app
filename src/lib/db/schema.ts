import { pgTable, text, timestamp, uuid, jsonb, numeric, unique } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  logoUrl: text('logo_url'), // Optional company logo URL
  injuryTimerLastReset: timestamp('injury_timer_last_reset').defaultNow(),
  injuryTimerResetBy: text('injury_timer_reset_by'),
  enabledModules: jsonb('enabled_modules').default(['start-of-day', 'end-of-day', 'job-hazard-analysis', 'timesheet']), // Available modules for this company
  modulesLastUpdatedAt: timestamp('modules_last_updated_at'),
  modulesLastUpdatedBy: text('modules_last_updated_by'), // Admin name who last updated modules
  modulesLastUpdatedByUserId: text('modules_last_updated_by_user_id'), // Admin user ID for reference
  createdBy: uuid('created_by'), // Super-admin user ID who created this company
  wordpressUserId: text('wordpress_user_id'), // WordPress user ID for company owner
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  role: text('role').notNull().default('contractor'), // 'contractor', 'admin', 'super-admin'
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
  jobName: text('job_name').notNull(), // Name/title of the specific job
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
  jobName: text('job_name').notNull(), // Name/title of the specific job
  jobDescription: text('job_description').notNull(), // Information about the job
  timeSpent: numeric('time_spent', { precision: 5, scale: 2 }).notNull(), // Time spent on site
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  approvedBy: uuid('approved_by'), // Admin user ID who approved/rejected
  approvedByName: text('approved_by_name'), // Admin name for display
  approvedAt: timestamp('approved_at'), // When it was approved/rejected
  rejectionReason: text('rejection_reason'), // Optional reason for rejection
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  companyId: uuid('company_id').notNull(),
  code: text('code').notNull().unique(), // Used for login - still globally unique
  rate: numeric('rate', { precision: 10, scale: 2 }).default('0.00'), // Hourly rate for contractor
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same email can exist across companies but not within same company
  companyEmailUnique: unique().on(table.companyId, table.email),
}))

export const toolboxTalks = pgTable('toolbox_talks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(), // HTML content from WYSIWYG editor
  status: text('status').notNull().default('draft'), // 'draft', 'published'
  companyId: uuid('company_id').notNull(),
  authorId: uuid('author_id').notNull(), // Admin user who created it
  authorName: text('author_name').notNull(), // Admin name for display
  publishedAt: timestamp('published_at'), // When it was published
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

