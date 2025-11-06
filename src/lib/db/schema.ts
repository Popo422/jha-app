import { pgTable, text, timestamp, uuid, jsonb, numeric, unique, boolean, integer, date } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  logoUrl: text('logo_url'), // Optional company logo URL
  injuryTimerLastReset: timestamp('injury_timer_last_reset').defaultNow(),
  injuryTimerResetBy: text('injury_timer_reset_by'),
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
  submissionType: text('submission_type').notNull(), // 'end-of-day', 'job-hazard-analysis', 'start-of-day', 'incident-report', 'quick-incident-report', 'near-miss-report', 'vehicle-inspection', 'timesheet'
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
  rate: numeric('rate', { precision: 10, scale: 2 }).default('0.00'), // Standard hourly rate for contractor
  overtimeRate: numeric('overtime_rate', { precision: 10, scale: 2 }), // Overtime rate (typically 1.5x standard)
  doubleTimeRate: numeric('double_time_rate', { precision: 10, scale: 2 }), // Double time rate (typically 2x standard)
  companyName: text('company_name'), // Optional: contractor's own company name for login token
  language: text('language').default('en'), // Language preference: 'en' or 'es'
  type: text('type').default('contractor'), // Type: 'contractor' or 'foreman'
  address: text('address'),
  phone: text('phone'),
  race: text('race'),
  gender: text('gender'),
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
  projectCost: numeric('project_cost', { precision: 12, scale: 2 }), // Optional project cost
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same project name can exist across companies but not within same company
  companyProjectUnique: unique().on(table.companyId, table.name),
}))

export const subcontractors = pgTable('subcontractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  contractAmount: numeric('contract_amount', { precision: 12, scale: 2 }), // Optional budget/contract amount
  companyId: uuid('company_id').notNull(),
  foreman: text('foreman'), // Optional foreman name
  address: text('address'),
  contact: text('contact'),
  email: text('email'),
  phone: text('phone'),
  enabledModules: jsonb('enabled_modules').$type<string[]>().default(['start-of-day', 'end-of-day', 'job-hazard-analysis', 'timesheet']), // Available modules for this subcontractor
  modulesLastUpdatedAt: timestamp('modules_last_updated_at'),
  modulesLastUpdatedBy: text('modules_last_updated_by'), // Admin name who last updated modules
  modulesLastUpdatedByUserId: text('modules_last_updated_by_user_id'), // Admin user ID for reference
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same subcontractor name can exist across companies but not within same company
  companySubcontractorUnique: unique().on(table.companyId, table.name),
}))

// Junction table for many-to-many relationship between subcontractors and projects
export const subcontractorProjects = pgTable('subcontractor_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  subcontractorId: uuid('subcontractor_id').notNull().references(() => subcontractors.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  assignedBy: text('assigned_by'), // Admin name who made the assignment
  assignedByUserId: text('assigned_by_user_id'), // Admin user ID for reference
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: prevent duplicate assignments
  subcontractorProjectUnique: unique().on(table.subcontractorId, table.projectId),
}))

export const supervisors = pgTable('supervisors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  companyId: uuid('company_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same supervisor name can exist across companies but not within same company
  companySupervisorUnique: unique().on(table.companyId, table.name),
}))

export const projectManagers = pgTable('project_managers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  companyId: uuid('company_id').notNull(),
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

export const formTemplates = pgTable('form_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  modules: jsonb('modules').$type<string[]>().notNull(), // Array of module IDs
  companyId: uuid('company_id').notNull(),
  createdBy: uuid('created_by').notNull(), // Admin user ID who created it
  createdByName: text('created_by_name').notNull(), // Admin name for display
  isDefault: text('is_default').notNull().default('false'), // 'true' for system defaults, 'false' for custom
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same template name can exist across companies but not within same company
  companyTemplateUnique: unique().on(table.companyId, table.name),
}))

// Junction table for many-to-many relationship between contractors and projects
export const contractorProjects = pgTable('contractor_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  assignedBy: text('assigned_by'), // Admin/foreman name who made the assignment
  assignedByUserId: text('assigned_by_user_id'), // Admin/foreman user ID for reference
  role: text('role').default('worker'), // Role on project: 'worker', 'lead', 'supervisor'
  isActive: boolean('is_active').notNull().default(true), // Allow temporary deactivation
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: prevent duplicate assignments
  contractorProjectUnique: unique().on(table.contractorId, table.projectId),
}))

export const procoreIntegrations = pgTable('procore_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  procoreCompanyId: text('procore_company_id').notNull(),
  procoreAccessToken: text('procore_access_token').notNull(),
  procoreRefreshToken: text('procore_refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  syncSettings: jsonb('sync_settings').default({}), // Configuration options for sync
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: prevent duplicate integrations per company-procore pair
  companyProcoreUnique: unique().on(table.companyId, table.procoreCompanyId),
}))

// Project Documents Schema
export const projectDocuments = pgTable('project_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Filename
  description: text('description'), // Optional description
  category: text('category').notNull().default('Other'), // Document category
  fileType: text('file_type').notNull(), // File extension
  fileSize: integer('file_size').notNull(), // File size in bytes
  url: text('url').notNull(), // Vercel Blob storage URL
  blobKey: text('blob_key').notNull(), // Vercel Blob key for deletion
  companyId: uuid('company_id').notNull(),
  uploadedBy: uuid('uploaded_by').notNull(), // Admin user ID who uploaded
  uploadedByName: text('uploaded_by_name').notNull(), // Admin name for display
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Project Tasks (Gantt-like) Schema
export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),

  taskNumber: integer('task_number').notNull(), // 1, 2, 3, 4... unique within project
  name: text('name').notNull(), // e.g. "Mobilize", "Install", etc.
  durationDays: integer('duration_days'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  predecessors: text('predecessors'), // "1,2,3" or "1FS+5 days" - references taskNumber
  progress: numeric('progress', { precision: 5, scale: 2 }).default('0'), // e.g. 0–100
  cost: numeric('cost', { precision: 12, scale: 2 }), // Optional task cost
  completed: boolean('completed').default(false), // Whether task is marked as completed

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique task numbers within each project
  projectTaskNumberUnique: unique().on(table.projectId, table.taskNumber),
}))

// Change Orders Schema
export const changeOrders = pgTable('change_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull(),

  // Basic Information
  title: text('title').notNull(),
  description: text('description'),
  changeType: text('change_type').notNull(), // 'Scope', 'Time', 'Cost', 'All'
  
  // Cost Impact
  originalContractAmount: numeric('original_contract_amount', { precision: 12, scale: 2 }),
  newAmount: numeric('new_amount', { precision: 12, scale: 2 }),
  costDifference: numeric('cost_difference', { precision: 12, scale: 2 }),
  
  // Schedule Impact
  addedDays: integer('added_days').default(0),
  originalEndDate: date('original_end_date'),
  revisedEndDate: date('revised_end_date'),
  
  
  // Request Information
  requestedBy: text('requested_by').notNull(), // Project Manager name
  requestedByUserId: uuid('requested_by_user_id'), // Admin user ID
  submissionDate: timestamp('submission_date').notNull().defaultNow(),
  notesOrJustification: text('notes_or_justification'),
  
  // Admin Approval Section
  toBeApprovedBy: text('to_be_approved_by'), // Project Manager(s) who need to approve
  toBeApprovedByUserIds: jsonb('to_be_approved_by_user_ids').$type<string[]>().default([]), // Admin user IDs
  keyStakeholder: text('key_stakeholder'),
  status: text('status').notNull().default('Pending'), // 'Pending', 'Approved', 'Rejected'
  assignedApproverId: uuid('assigned_approver_id'), // Current approver
  assignedApproverName: text('assigned_approver_name'),
  
  // Approval Information
  approverSignature: text('approver_signature'),
  dateApproved: timestamp('date_approved'),
  dateRejected: timestamp('date_rejected'),
  rejectionReason: text('rejection_reason'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique change order titles within each project
  projectChangeOrderTitleUnique: unique().on(table.projectId, table.title),
}))

// Change Order Documents Schema
export const changeOrderDocuments = pgTable('change_order_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  changeOrderId: uuid('change_order_id')
    .notNull()
    .references(() => changeOrders.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull(),
  
  name: text('name').notNull(), // Filename
  description: text('description'), // Optional description
  category: text('category').notNull().default('Supporting Document'), // Document category
  fileType: text('file_type').notNull(), // File extension
  fileSize: integer('file_size').notNull(), // File size in bytes
  url: text('url').notNull(), // Vercel Blob storage URL
  blobKey: text('blob_key').notNull(), // Vercel Blob key for deletion
  
  uploadedBy: uuid('uploaded_by').notNull(), // Admin user ID who uploaded
  uploadedByName: text('uploaded_by_name').notNull(), // Admin name for display
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

