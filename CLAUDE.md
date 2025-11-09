# JHA Construction Management App - Technical Documentation

## Project Overview
A comprehensive construction project management application built with Next.js 14, featuring **two distinct applications** within a single codebase: an admin management dashboard and a contractor-facing form system.

## Dual Application Architecture

### Two Apps, One Codebase
This project contains **two separate applications** that share infrastructure but serve different user types:

#### 1. Admin Application (`/admin/*`)
- **Purpose**: Full management dashboard for construction company administrators
- **Features**: 
  - Project management and oversight
  - Expense tracking and approval
  - Contractor management
  - Document management
  - Analytics and reporting
  - Task assignment and scheduling
- **UI/UX**: Complex dashboard with tables, charts, and comprehensive CRUD operations
- **Authentication**: JWT-based admin authentication with full company access
- **User Base**: Construction company managers, supervisors, administrators

#### 2. Contractor Application (`/contractor-*`)
- **Purpose**: Simple form-based interface for field contractors
- **Features**:
  - Daily form submissions (start-of-day, end-of-day)
  - Safety reporting (near-miss, incident reports)
  - Vehicle inspections
  - Basic profile management
- **UI/UX**: Mobile-optimized, step-by-step forms with minimal navigation
- **Authentication**: JWT-based contractor authentication with limited scope
- **User Base**: Field workers, subcontractors, on-site personnel

### Architectural Separation

#### Route Structure
```
/admin/                    # Admin Dashboard
├── dashboard/            # Admin home/overview
├── projects/            # Project management
├── expenses/           # Expense management
├── project-tasks/      # Task management
├── subcontractors/     # Contractor management
└── ...

/contractor-forms/        # Contractor Forms
├── start-of-day-v2/    # Morning safety forms
├── end-of-day-v2/      # End of shift reports
├── near-miss-report/   # Safety incident forms
├── vehicle-inspection/ # Equipment checks
└── ...

/contractor-editor/       # Contractor Profile Management
```

#### API Endpoint Separation
```
/api/admin/              # Admin-only endpoints
├── projects/           # Full project CRUD
├── expenses/          # Expense management
├── contractors/       # Contractor management
└── ...

/api/contractors/        # Contractor-specific endpoints
├── forms/             # Form submissions
├── profile/           # Profile updates
└── ...

/api/                   # Shared endpoints
├── auth/              # Authentication for both
├── integrations/      # External API integrations
└── ...
```

### Different User Experiences

#### Admin Experience
- **Dashboard-style interface** with comprehensive data views
- **Complex forms** with multiple steps and validation
- **Data tables** with sorting, filtering, search, and export
- **Modal dialogs** for quick edits and detailed views
- **Rich analytics** and reporting capabilities
- **Multi-project oversight** across entire company

#### Contractor Experience  
- **Linear form flows** optimized for mobile devices
- **Step-by-step wizards** with clear progress indicators
- **Touch-friendly interfaces** for field use
- **Simplified navigation** focused on task completion
- **Offline capabilities** (where implemented)
- **Single-project focus** based on assignments

### Shared Infrastructure
Both applications share:
- **Authentication system** (different token types)
- **Database schema** (with proper scoping)
- **File upload system** (Vercel Blob)
- **AI processing** (Gemini integration)
- **Component library** (shadcn/ui base components)
- **Utility functions** and hooks

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with dual auth system (admin + contractor)
- **State Management**: RTK Query for API calls and caching
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **File Storage**: Vercel Blob (50MB limit per file)
- **AI Integration**: Google Gemini 2.5 Flash for OCR and document processing
- **Deployment**: Vercel

## Project Structure

### Core Directories
```
src/
├── app/                          # Next.js 14 App Router
│   ├── admin/                    # Admin dashboard routes
│   │   ├── expenses/             # Expense management
│   │   ├── project-tasks/        # Project task management
│   │   ├── projects/             # Project management
│   │   └── ...                   # Other admin features
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin-only endpoints
│   │   ├── contractors/          # Contractor endpoints
│   │   └── ...                   # Shared endpoints
│   ├── contractor-forms/         # Contractor form routes
│   └── contractor-editor/        # Contractor management
├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui base components
│   ├── admin/                    # Admin-specific components
│   └── forms/                    # Form step components
├── lib/                         # Core utilities and configurations
│   ├── db/                       # Database configuration and schema
│   ├── features/                 # RTK Query API slices
│   └── utils/                    # Utility functions
└── hooks/                       # Custom React hooks
```

## Authentication System

### Dual Authentication Architecture
The app uses separate authentication systems for admins and contractors:

#### Admin Authentication
- **Cookie**: `adminAuthToken`
- **Header**: `Authorization: AdminBearer <token>`
- **Payload Structure**:
```typescript
interface AdminTokenPayload {
  admin: {
    id: string
    employeeId: string
    name: string
    role: string
    companyId: string
  }
  isAdmin: boolean
  iat: number
  exp: number
}
```

#### Contractor Authentication
- **Cookie**: `contractorAuthToken`
- **Header**: `Authorization: ContractorBearer <token>`
- **Payload Structure**:
```typescript
interface ContractorTokenPayload {
  contractor: {
    id: string
    email: string
    name: string
    companyId: string
  }
  isContractor: boolean
  iat: number
  exp: number
}
```

### Authentication Helpers
Common authentication pattern in API routes:
```typescript
function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (!adminToken) throw new Error('Admin authentication required')
  
  const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
  if (!decoded.admin || !decoded.isAdmin) throw new Error('Invalid admin token')
  
  return { admin: decoded.admin }
}
```

## Database Schema

### Key Tables
- **companies**: Multi-tenant company data
- **admin_users**: Admin user accounts
- **contractors**: Contractor accounts
- **projects**: Project information
- **expenses**: Expense tracking with receipt uploads
- **expense_projects**: Many-to-many expense-project assignments
- **expense_documents**: File attachments for expenses
- **project_tasks**: Task management with AI extraction
- **form_templates**: Dynamic form configurations

### Important Relationships
- All data is scoped by `companyId` for multi-tenancy
- Many-to-many relationships use junction tables (e.g., `expense_projects`)
- File uploads store both Vercel Blob URLs and blob keys for cleanup

## State Management with RTK Query

### API Structure
```typescript
// Example API slice structure
export const expensesApi = createApi({
  reducerPath: 'expensesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/expenses',
    credentials: 'include', // Important for cookies
  }),
  tagTypes: ['Expense'],
  endpoints: (builder) => ({
    getExpenses: builder.query<ExpensesResponse, ExpensesParams>({
      query: (params) => ({
        url: '',
        params: cleanParams(params)
      }),
      providesTags: ['Expense']
    }),
    // ... other endpoints
  })
})
```

### Store Configuration
```typescript
// Must include all API reducers and middleware
export const store = configureStore({
  reducer: {
    [expensesApi.reducerPath]: expensesApi.reducer,
    [projectsApi.reducerPath]: projectsApi.reducer,
    // ... other APIs
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      expensesApi.middleware,
      projectsApi.middleware,
      // ... other API middleware
    ),
})
```

## File Upload System

### Architecture
- **Frontend**: Files uploaded via forms or drag-and-drop
- **Upload Endpoint**: `/api/admin/[feature]/upload-[type]/route.ts`
- **Storage**: Vercel Blob with 50MB per file limit
- **Cleanup**: Automatic deletion when parent records are deleted

### Upload Pattern
```typescript
// 1. Upload to temporary location
const tempPrefix = `temp-receipts/${companyId}/`
const blob = await put(`${tempPrefix}${file.name}`, file, {
  access: 'public',
  handleBlobUploadUrl: {
    onUploadProgress: ({ loaded, total }) => {
      // Progress handling
    },
  },
})

// 2. Move to permanent location after processing
const permanentBlob = await put(`receipts/${companyId}/${filename}`, file, {
  access: 'public'
})

// 3. Store both URL and blob key for cleanup
await db.insert(documents).values({
  url: permanentBlob.url,
  blobKey: permanentBlob.pathname, // Critical for cleanup
  // ... other fields
})
```

### File Cleanup
When deleting records with files:
```typescript
// 1. Get associated documents
const documents = await db.select().from(expenseDocuments)
  .where(eq(expenseDocuments.expenseId, expenseId))

// 2. Delete from Vercel Blob
if (documents.length > 0) {
  const deletePromises = documents.map(async (doc) => {
    if (doc.blobKey) {
      await del(doc.blobKey) // Use blobKey, not URL
    }
  })
  await Promise.allSettled(deletePromises)
}

// 3. Delete database records (cascade handles relations)
await db.delete(expenses).where(eq(expenses.id, expenseId))
```

## AI Integration

### Google Gemini Setup
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

// File processing pattern
const { data: base64Data, mimeType } = await fetchFileAsBase64(fileUrl)
const imagePart = {
  inlineData: {
    data: base64Data,
    mimeType: mimeType
  }
}

const result = await model.generateContent([EXTRACTION_PROMPT, imagePart])
```

### OCR Processing Flow
1. **Upload**: File uploaded to temporary Vercel Blob location
2. **Extract**: AI processes file and extracts structured data
3. **Review**: User reviews and edits extracted data
4. **Import**: Data saved to database, file moved to permanent location

## Component Patterns

### Admin Data Tables
Standard pattern for data tables with CRUD operations:
```typescript
<AdminDataTable
  data={items}
  columns={columns}
  isLoading={isLoading}
  isFetching={isFetching}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onBulkDelete={handleBulkDelete}
  getRowId={(item) => item.id}
  exportFilename="items"
  searchValue={searchValue}
  onSearchChange={setSearchValue}
/>
```

### Form Step Components
Multi-step forms use consistent patterns:
```typescript
// Each step is a separate component
<StepComponent
  formData={formData}
  setFormData={setFormData}
  onNext={handleNext}
  onPrevious={handlePrevious}
  isValid={isStepValid}
/>
```

### Modal Dialogs
Standard dialog pattern with shadcn/ui:
```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave} disabled={!isValid || isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## API Route Patterns

### Standard CRUD Structure
```typescript
// GET /api/admin/[resource]/route.ts
export async function GET(request: NextRequest) {
  const auth = authenticateAdmin(request)
  const { searchParams } = new URL(request.url)
  
  // Extract query parameters
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '50')
  
  // Database query with company scoping
  const items = await db.select()
    .from(table)
    .where(eq(table.companyId, auth.admin.companyId))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  
  return NextResponse.json({ items, totalCount, page, pageSize })
}

// POST /api/admin/[resource]/route.ts
export async function POST(request: NextRequest) {
  const auth = authenticateAdmin(request)
  const body = await request.json()
  
  const newItem = await db.insert(table).values({
    ...body,
    companyId: auth.admin.companyId,
    createdBy: auth.admin.id,
    createdByName: auth.admin.name
  }).returning()
  
  return NextResponse.json({ success: true, item: newItem[0] })
}
```

### Individual Resource Routes
```typescript
// GET|PUT|DELETE /api/admin/[resource]/[id]/route.ts
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAdmin(request)
  const resolvedParams = await params
  const id = resolvedParams.id
  
  const item = await db.select()
    .from(table)
    .where(and(
      eq(table.id, id),
      eq(table.companyId, auth.admin.companyId)
    ))
    .limit(1)
  
  if (item.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  return NextResponse.json({ item: item[0] })
}
```

## Common Issues & Solutions

### RTK Query Store Configuration
**Issue**: "Cannot read properties of undefined" errors
**Solution**: Ensure all API slices are added to store reducers and middleware

### SQL Array Queries
**Issue**: `ANY($1)` SQL errors
**Solution**: Use Drizzle's `inArray()` function instead of raw SQL:
```typescript
// Wrong
.where(sql`${table.id} = ANY(${JSON.stringify(ids)})`)

// Correct  
.where(inArray(table.id, ids))
```

### File Upload Limits
**Issue**: Vercel serverless function limits
**Solution**: 
- Limit uploads to 50MB per file
- Use temporary storage pattern
- Implement proper cleanup

### Component Updates During Render
**Issue**: "Cannot update component while rendering" warnings
**Solution**: Use useEffect or event handlers instead of direct state updates in render

## Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key"

# AI Integration
GEMINI_API_KEY="your-gemini-key"

# File Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

## Development Guidelines

### New Feature Development Workflow

When adding any new feature to the application, follow this systematic approach:

#### 1. Tab Integration Pattern
```typescript
// When adding new tabs to existing dashboards:
// 1. Update grid-cols-X to grid-cols-X+1 in TabsList
// 2. Add TabsTrigger with appropriate icon + text
// 3. Add TabsContent with new component
// 4. Import new component and lucide-react icon
```

#### 2. Database-to-UI Data Flow Pattern
```typescript
// Standard pattern for new data features:
// 1. Create RTK Query API slice in /lib/features/[feature]/
// 2. Create backend API route in /api/admin/[feature]/
// 3. Add database queries with company scoping
// 4. Create UI components that consume the API
// 5. Add proper loading/error states throughout
```

#### 3. Multi-Step Feature Creation Pattern
```typescript
// For complex features requiring multiple pages/steps:
// 1. Create route: /admin/[feature]/[id]/[action]/page.tsx
// 2. Create wizard/multi-step component with state management
// 3. Implement step-based navigation with visual indicators
// 4. Add "Go Back" navigation to parent feature
```

#### 4. TypeScript-First Development
```typescript
// Always start with types, then implement:
// 1. Define interfaces for all data structures
// 2. Add proper error handling with type guards
// 3. Use type assertions for dynamic object access (keyof typeof)
// 4. Handle async params properly in Next.js 14 routes
```

### Code Style
- Use TypeScript for all files
- Follow existing component patterns
- Add proper error handling
- Include loading states
- Implement proper cleanup

### Testing New Features
1. Test authentication flows
2. Verify company data scoping
3. Test file upload/cleanup
4. Check mobile responsiveness
5. Validate error handling

### Performance Considerations
- Use RTK Query caching effectively
- Implement proper pagination
- Optimize large file uploads
- Use React.memo for expensive components

## Future Enhancements
- Real-time updates with WebSockets
- Enhanced mobile experience
- Advanced reporting dashboard
- Integration with accounting software
- Multi-language support

## Key Files to Reference
- `/src/lib/store.ts` - RTK Query store configuration
- `/src/lib/db/schema.ts` - Database schema definitions
- `/src/components/admin/AdminDataTable.tsx` - Standard table component
- `/src/hooks/useAuth.ts` - Authentication utilities
- Any existing API route for authentication patterns