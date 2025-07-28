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
  enabledModules: jsonb('enabled_modules').default(['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'quick-incident-report', 'timesheet']), // Available modules for this company
  modulesLastUpdatedAt: timestamp('modules_last_updated_at'),
  modulesLastUpdatedBy: text('modules_last_updated_by'), // Admin name who last updated modules
  modulesLastUpdatedByUserId: text('modules_last_updated_by_user_id'), // Admin user ID for reference
  membershipInfo: jsonb('membership_info').default({
    membershipLevel: "3",
    user: null,
    memberships: [],
    tokenVerifiedAt: new Date().toISOString()
  }), // JSON field for membership level and user data
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
  companyName: text('company_name'), // Optional: admin/contractor's own company name
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
  projectName: text('project_name').notNull(),
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
  projectName: text('project_name').notNull(),
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
  companyName: text('company_name'), // Optional: contractor's own company name for login token
  language: text('language').default('en'), // Language preference: 'en' or 'es'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same email can exist across companies but not within same company
  companyEmailUnique: unique().on(table.companyId, table.email),
}))

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  projectManager: text('project_manager').notNull(),
  location: text('location').notNull(),
  companyId: uuid('company_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same project name can exist across companies but not within same company
  companyProjectUnique: unique().on(table.companyId, table.name),
}))

export const subcontractors = pgTable('subcontractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  companyId: uuid('company_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same subcontractor name can exist across companies but not within same company
  companySubcontractorUnique: unique().on(table.companyId, table.name),
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

export const toolboxTalkReadEntries = pgTable('toolbox_talk_read_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolboxTalkId: uuid('toolbox_talk_id').notNull(),
  companyId: uuid('company_id').notNull(),
  readBy: text('read_by').notNull(), // Name of the person who read it
  dateRead: text('date_read').notNull(), // Date when read (YYYY-MM-DD format)
  signature: text('signature').notNull(), // Digital signature
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: prevent duplicate readings by same person for same talk
  talkReadByUnique: unique().on(table.toolboxTalkId, table.readBy, table.companyId),
}))

