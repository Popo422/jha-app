import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Expense Categories
export const EXPENSE_CATEGORIES = [
  'Labor',
  'Materials',
  'Equipment',
  'Subcontractors',
  'Sitework / Site Preparation',
  'Permits & Fees',
  'Design & Professional Services',
  'General Conditions / Jobsite Overhead',
  'Insurance & Bonds',
  'Safety',
  'Testing & Inspection',
  'Temporary Facilities & Utilities',
  'Project Administration / General Overhead',
  'Contingency',
  'Financing Costs',
  'Closeout & Turnover',
  'Other'
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export interface Expense {
  id: string
  companyId: string
  name: string
  description?: string
  price: string
  quantity: string
  totalCost: string
  date: string
  category: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseProject {
  id: string
  expenseId: string
  projectId: string
  percentage: string
  allocatedAmount: string
  assignedBy: string
  assignedByName: string
  assignedAt: string
  project?: {
    id: string
    name: string
  }
}

export interface ExpenseDocument {
  id: string
  expenseId: string
  companyId: string
  name: string
  description?: string
  fileType: string
  fileSize: number
  url: string
  blobKey: string
  uploadedBy: string
  uploadedByName: string
  createdAt: string
}

export interface ExpenseWithDetails extends Expense {
  projects: ExpenseProject[]
  documents: ExpenseDocument[]
  projectNames: string[]
  documentCount: number
}

export interface CreateExpenseRequest {
  name: string
  description?: string
  price: number
  quantity: number
  totalCost: number
  date: string
  category: string
  projectIds?: string[]
}

export interface UpdateExpenseRequest {
  id: string
  name?: string
  description?: string
  price?: number
  quantity?: number
  totalCost?: number
  date?: string
  category?: string
}

export interface AssignProjectsRequest {
  expenseId: string
  projectAssignments: Array<{
    projectId: string
    percentage: number
  }>
}

export interface UploadReceiptRequest {
  file?: File
  url?: string
}

export interface UploadReceiptResponse {
  success: boolean
  fileUrl: string
  filename: string
  message: string
}

export interface ExtractExpensesRequest {
  fileUrl: string
}

export interface ExtractExpensesResponse {
  success: boolean
  extractedExpenses: Array<{
    name: string
    description?: string
    price: number
    quantity: number
    totalCost: number
    date?: string
    category: string
  }>
  message: string
}

export interface BulkImportExpensesRequest {
  extractedExpenses: Array<{
    name: string
    description?: string
    price: number
    quantity: number
    date: string
    category: string
    projectIds?: string[]
  }>
  projectIds?: string[]
}

export interface ExpensesResponse {
  success: boolean
  expenses: ExpenseWithDetails[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export interface ExpenseResponse {
  success: boolean
  expense: ExpenseWithDetails
  message: string
}

export interface BulkImportResponse {
  success: boolean
  message: string
  count: number
  expenses: ExpenseWithDetails[]
}

export interface DeleteExpenseResponse {
  success: boolean
  message: string
}

export interface ExpenseQueryParams {
  page?: number
  pageSize?: number
  search?: string
  projectId?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
}

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/admin/expenses',
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json')
    return headers
  },
})

export const expensesApi = createApi({
  reducerPath: 'expensesApi',
  baseQuery,
  tagTypes: ['Expense', 'ExpenseDocument'],
  endpoints: (builder) => ({
    // Get all expenses with filtering and pagination
    getExpenses: builder.query<ExpensesResponse, ExpenseQueryParams>({
      query: ({ page = 1, pageSize = 10, search, projectId, category, dateFrom, dateTo, minAmount, maxAmount }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        
        if (search) params.append('search', search)
        if (projectId) params.append('projectId', projectId)
        if (category) params.append('category', category)
        if (dateFrom) params.append('dateFrom', dateFrom)
        if (dateTo) params.append('dateTo', dateTo)
        if (minAmount !== undefined) params.append('minAmount', minAmount.toString())
        if (maxAmount !== undefined) params.append('maxAmount', maxAmount.toString())
        
        return `?${params.toString()}`
      },
      providesTags: (result) =>
        result ? [
          ...result.expenses.map(({ id }) => ({ type: 'Expense' as const, id })),
          { type: 'Expense', id: 'LIST' },
        ] : [{ type: 'Expense', id: 'LIST' }],
    }),

    // Get single expense with full details
    getExpense: builder.query<ExpenseResponse, { id: string }>({
      query: ({ id }) => `/${id}`,
      providesTags: (result, error, { id }) => [{ type: 'Expense', id }],
    }),

    // Create a single expense
    createExpense: builder.mutation<ExpenseResponse, CreateExpenseRequest>({
      query: (expense) => ({
        url: '',
        method: 'POST',
        body: expense,
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // Update an expense
    updateExpense: builder.mutation<ExpenseResponse, UpdateExpenseRequest>({
      query: ({ id, ...expense }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: expense,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Delete an expense
    deleteExpense: builder.mutation<DeleteExpenseResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Assign/reassign projects to expense
    assignProjects: builder.mutation<ExpenseResponse, AssignProjectsRequest>({
      query: ({ expenseId, projectAssignments }) => ({
        url: `/${expenseId}/projects`,
        method: 'POST',
        body: { projectAssignments },
      }),
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'Expense', id: expenseId },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Upload receipt file
    uploadReceipt: builder.mutation<UploadReceiptResponse, UploadReceiptRequest>({
      queryFn: async (arg, api, extraOptions, baseQuery) => {
        const { file, url } = arg as UploadReceiptRequest
        const formData = new FormData()
        if (file) formData.append('file', file)
        if (url) formData.append('url', url)
        
        try {
          const response = await fetch('/api/admin/expenses/upload-receipt', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
          
          if (!response.ok) {
            const error = await response.json()
            return { error }
          }
          
          const data = await response.json()
          return { data }
        } catch (error) {
          return { error: { message: 'Upload failed' } }
        }
      },
    }),

    // Extract expenses from uploaded receipt using AI
    extractExpenses: builder.mutation<ExtractExpensesResponse, ExtractExpensesRequest>({
      query: (request) => ({
        url: '/extract-expenses',
        method: 'POST',
        body: request,
      }),
    }),

    // Bulk import extracted expenses
    bulkImportExpenses: builder.mutation<BulkImportResponse, BulkImportExpensesRequest>({
      query: (request) => ({
        url: '/bulk-import',
        method: 'POST',
        body: request,
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // Upload document to existing expense
    uploadExpenseDocument: builder.mutation<{ success: boolean; document: ExpenseDocument }, { expenseId: string; file: File; description?: string }>({
      queryFn: async ({ expenseId, file, description }, api, extraOptions, baseQuery) => {
        const formData = new FormData()
        formData.append('file', file)
        if (description) formData.append('description', description)
        
        try {
          const response = await fetch(`/api/admin/expenses/${expenseId}/documents`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
          
          if (!response.ok) {
            const error = await response.json()
            return { error }
          }
          
          const data = await response.json()
          return { data }
        } catch (error) {
          return { error: { message: 'Document upload failed' } }
        }
      },
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'Expense', id: expenseId },
        { type: 'ExpenseDocument', id: 'LIST' },
      ],
    }),

    // Update project assignments
    updateProjectAssignments: builder.mutation<{ success: boolean; projectAssignments: any[] }, { expenseId: string; projectIds: string[] }>({
      query: ({ expenseId, projectIds }) => ({
        url: `/${expenseId}/projects`,
        method: 'POST',
        body: { projectIds },
      }),
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'Expense', id: expenseId },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Delete expense document
    deleteExpenseDocument: builder.mutation<DeleteExpenseResponse, { expenseId: string; documentId: string }>({
      query: ({ expenseId, documentId }) => ({
        url: `/${expenseId}/documents/${documentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'Expense', id: expenseId },
        { type: 'ExpenseDocument', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useAssignProjectsMutation,
  useUpdateProjectAssignmentsMutation,
  useUploadReceiptMutation,
  useExtractExpensesMutation,
  useBulkImportExpensesMutation,
  useUploadExpenseDocumentMutation,
  useDeleteExpenseDocumentMutation,
} = expensesApi