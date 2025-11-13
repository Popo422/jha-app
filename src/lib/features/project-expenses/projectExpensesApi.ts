import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ProjectExpense {
  id: string
  projectId: string
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

export interface ProjectExpenseDocument {
  id: string
  expenseId: string
  projectId: string
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

export interface ProjectExpenseWithDetails extends ProjectExpense {
  documents: ProjectExpenseDocument[]
  documentCount: number
}

export interface ProjectExpensesResponse {
  success: boolean
  expenses: ProjectExpenseWithDetails[]
  totalAmount?: number
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export interface ProjectExpenseResponse {
  success: boolean
  expense: ProjectExpenseWithDetails
  message: string
}

export interface ProjectExpenseQueryParams {
  projectId: string
  page?: number
  pageSize?: number
  search?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
}

export interface CreateProjectExpenseRequest {
  projectId: string
  name: string
  description?: string
  price: number
  quantity: number
  totalCost: number
  date: string
  category: string
}

export interface UpdateProjectExpenseRequest {
  projectId: string
  expenseId: string
  name?: string
  description?: string
  price?: number
  quantity?: number
  totalCost?: number
  date?: string
  category?: string
}

export interface DeleteProjectExpenseRequest {
  projectId: string
  expenseId: string
}

export interface UploadProjectExpenseDocumentRequest {
  projectId: string
  expenseId: string
  file: File
  description?: string
}

export interface DeleteProjectExpenseResponse {
  success: boolean
  message: string
}

export interface BulkImportProjectExpensesRequest {
  projectId: string
  extractedExpenses: Array<{
    name: string
    description?: string
    price: number
    quantity: number
    totalCost: number
    date: string
    category: string
  }>
}

export interface BulkImportProjectExpensesResponse {
  success: boolean
  message: string
  count: number
  expenses: ProjectExpenseWithDetails[]
}

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/admin/project-expenses',
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json')
    return headers
  },
})

function cleanParams(params: Record<string, any>) {
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value
    }
  }
  return cleaned
}

export const projectExpensesApi = createApi({
  reducerPath: 'projectExpensesApi',
  baseQuery,
  tagTypes: ['ProjectExpense', 'ProjectExpenseDocument'],
  endpoints: (builder) => ({
    // Get project expenses with filtering and pagination
    getProjectExpenses: builder.query<ProjectExpensesResponse, ProjectExpenseQueryParams>({
      query: (params) => ({
        url: '',
        params: cleanParams(params)
      }),
      providesTags: (result) =>
        result?.expenses
          ? [
              ...result.expenses.map(({ id }) => ({ type: 'ProjectExpense' as const, id })),
              { type: 'ProjectExpense', id: 'LIST' },
            ]
          : [{ type: 'ProjectExpense', id: 'LIST' }],
    }),

    // Get single project expense by ID
    getProjectExpense: builder.query<ProjectExpenseResponse, { projectId: string; expenseId: string }>({
      query: ({ projectId, expenseId }) => `/${projectId}/${expenseId}`,
      providesTags: (result, error, { expenseId }) => [{ type: 'ProjectExpense', id: expenseId }],
    }),

    // Create new project expense
    createProjectExpense: builder.mutation<ProjectExpenseResponse, CreateProjectExpenseRequest>({
      query: (expenseData) => ({
        url: '',
        method: 'POST',
        body: expenseData,
      }),
      invalidatesTags: [{ type: 'ProjectExpense', id: 'LIST' }],
    }),

    // Update project expense
    updateProjectExpense: builder.mutation<ProjectExpenseResponse, UpdateProjectExpenseRequest>({
      query: ({ projectId, expenseId, ...expenseData }) => ({
        url: `/${projectId}/${expenseId}`,
        method: 'PUT',
        body: expenseData,
      }),
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'ProjectExpense', id: expenseId },
        { type: 'ProjectExpense', id: 'LIST' },
      ],
    }),

    // Delete project expense
    deleteProjectExpense: builder.mutation<DeleteProjectExpenseResponse, DeleteProjectExpenseRequest>({
      query: ({ projectId, expenseId }) => ({
        url: `/${projectId}/${expenseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'ProjectExpense', id: expenseId },
        { type: 'ProjectExpense', id: 'LIST' },
      ],
    }),

    // Upload document for project expense
    uploadProjectExpenseDocument: builder.mutation<any, UploadProjectExpenseDocumentRequest>({
      query: ({ projectId, expenseId, file, description }) => {
        const formData = new FormData()
        formData.append('file', file)
        if (description) {
          formData.append('description', description)
        }

        return {
          url: `/${projectId}/${expenseId}/documents`,
          method: 'POST',
          body: formData,
          formData: true,
        }
      },
      invalidatesTags: (result, error, { expenseId }) => [
        { type: 'ProjectExpense', id: expenseId },
        { type: 'ProjectExpenseDocument', id: 'LIST' },
      ],
    }),

    // Bulk import project expenses
    bulkImportProjectExpenses: builder.mutation<BulkImportProjectExpensesResponse, BulkImportProjectExpensesRequest>({
      query: (data) => ({
        url: '/bulk-import',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'ProjectExpense', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetProjectExpensesQuery,
  useGetProjectExpenseQuery,
  useCreateProjectExpenseMutation,
  useUpdateProjectExpenseMutation,
  useDeleteProjectExpenseMutation,
  useUploadProjectExpenseDocumentMutation,
  useBulkImportProjectExpensesMutation,
} = projectExpensesApi