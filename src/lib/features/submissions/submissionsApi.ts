import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface SubmissionData {
  submissionType: 'end-of-day' | 'job-hazard-analysis' | 'start-of-day'
  jobSite: string
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
  jobSite: string
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

export interface GetSubmissionsResponse {
  submissions: Submission[]
  meta: {
    limit: number
    offset: number
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
  jobSite?: string
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
        formData.append('jobSite', data.jobSite)
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
      dateFrom?: string
      dateTo?: string
      company?: string
      search?: string
      limit?: number
      offset?: number
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: ({ type, dateFrom, dateTo, company, search, limit = 50, offset = 0, authType }) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        })
        
        if (type) {
          params.append('type', type)
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
  useDeleteSubmissionMutation,
  useUpdateSubmissionMutation,
  useDeleteAttachmentMutation
} = submissionsApi