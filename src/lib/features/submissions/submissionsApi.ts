import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface SubmissionData {
  submissionType: 'end-of-day' | 'job-hazard-analysis' | 'start-of-day' | 'incident-report' | 'quick-incident-report' | 'near-miss-report'
  projectName: string
  date: string
  dateTimeClocked?: string
  formData: Record<string, any>
  files?: File[]
  authType?: 'contractor' | 'admin' | 'any'
}

export interface Submission {
  id: string
  userId: string
  completedBy: string
  date: string
  dateTimeClocked?: string
  company: string
  projectName: string
  submissionType: string
  formData: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface SubmissionResponse {
  success: boolean
  submission?: Submission
  error?: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface GetSubmissionsResponse {
  submissions: Submission[]
  pagination?: PaginationInfo | null
  meta: {
    limit: number | null
    offset: number | null
    fetchAll?: boolean
    isAdmin: boolean
    userId: string | null
  }
}

export interface DeleteSubmissionResponse {
  success: boolean
  message?: string
  error?: string
}

export interface UpdateSubmissionData {
  id: string
  completedBy?: string
  date?: string
  dateTimeClocked?: string
  company?: string
  projectName?: string
  formData?: Record<string, any>
}

export interface UpdateSubmissionResponse {
  success: boolean
  submission?: Submission
  message?: string
  error?: string
}

export interface DeleteAttachmentData {
  submissionId: string
  fileUrl: string
  fileName?: string
}

export interface DeleteAttachmentResponse {
  success: boolean
  message?: string
  error?: string
}

export const submissionsApi = createApi({
  reducerPath: 'submissionsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/submissions',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      
      // Check for admin token first (admin has priority)
      if (state.auth.adminToken && state.auth.isAdminAuthenticated) {
        headers.set('Authorization', `AdminBearer ${state.auth.adminToken}`)
      }
      // Otherwise use regular user token
      else if (state.auth.token && state.auth.isAuthenticated) {
        headers.set('Authorization', `Bearer ${state.auth.token}`)
      }
      
      return headers
    },
  }),
  tagTypes: ['Submission'],
  endpoints: (builder) => ({
    submitForm: builder.mutation<SubmissionResponse, SubmissionData>({
      query: (data) => {
        const formData = new FormData()
        
        // Add form fields
        formData.append('submissionType', data.submissionType)
        formData.append('projectName', data.projectName)
        formData.append('date', data.date)
        formData.append('formData', JSON.stringify(data.formData))
        
        if (data.dateTimeClocked) {
          formData.append('dateTimeClocked', data.dateTimeClocked)
        }
        
        // Add files if any
        if (data.files) {
          data.files.forEach(file => {
            formData.append('files', file)
          })
        }

        // Add authType to URL if specified
        let url = ''
        if (data.authType) {
          url = `?authType=${data.authType}`
        }

        return {
          url,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['Submission'],
    }),
    getSubmissions: builder.query<GetSubmissionsResponse, { 
      type?: string
      excludeTypes?: string[]
      dateFrom?: string
      dateTo?: string
      company?: string
      search?: string
      page?: number
      pageSize?: number
      limit?: number
      offset?: number
      fetchAll?: boolean
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: ({ type, excludeTypes, dateFrom, dateTo, company, search, page, pageSize, limit, offset, fetchAll, authType }) => {
        const params = new URLSearchParams()
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else {
          // Use page/pageSize if provided, otherwise fall back to limit/offset
          if (page !== undefined && pageSize !== undefined) {
            params.append('page', page.toString())
            params.append('pageSize', pageSize.toString())
          } else {
            params.append('limit', (limit || 50).toString())
            params.append('offset', (offset || 0).toString())
          }
        }
        
        if (type) {
          params.append('type', type)
        }
        if (excludeTypes && excludeTypes.length > 0) {
          params.append('excludeTypes', excludeTypes.join(','))
        }
        if (dateFrom) {
          params.append('dateFrom', dateFrom)
        }
        if (dateTo) {
          params.append('dateTo', dateTo)
        }
        if (company) {
          params.append('company', company)
        }
        if (search) {
          params.append('search', search)
        }
        if (authType) {
          params.append('authType', authType)
        }
        
        return `?${params}`
      },
      providesTags: ['Submission'],
    }),
    getSubmission: builder.query<Submission, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Submission', id }],
    }),
    deleteSubmission: builder.mutation<DeleteSubmissionResponse, { id: string, authType?: 'contractor' | 'admin' | 'any' }>({
      query: ({ id, authType }) => {
        const params = new URLSearchParams({ id })
        if (authType) {
          params.append('authType', authType)
        }
        return {
          url: `?${params}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: ['Submission'],
    }),
    updateSubmission: builder.mutation<UpdateSubmissionResponse, UpdateSubmissionData & { authType?: 'contractor' | 'admin' | 'any' }>({
      query: ({ authType, ...data }) => {
        let url = ''
        if (authType) {
          url = `?authType=${authType}`
        }
        return {
          url,
          method: 'PUT',
          body: data,
        }
      },
      invalidatesTags: ['Submission'],
    }),
    deleteAttachment: builder.mutation<DeleteAttachmentResponse, DeleteAttachmentData>({
      query: (data) => ({
        url: '/attachments',
        method: 'DELETE',
        body: data,
      }),
      invalidatesTags: ['Submission'],
    }),
  }),
})

export const { 
  useSubmitFormMutation, 
  useGetSubmissionsQuery,
  useLazyGetSubmissionsQuery,
  useGetSubmissionQuery,
  useDeleteSubmissionMutation,
  useUpdateSubmissionMutation,
  useDeleteAttachmentMutation
} = submissionsApi