import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface SubmissionData {
  submissionType: 'end-of-day' | 'job-hazard-analysis' | 'start-of-day'
  jobSite: string
  date: string
  dateTimeClocked?: string
  formData: Record<string, any>
  files?: File[]
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
    userId: string
  }
}

export interface DeleteSubmissionResponse {
  success: boolean
  message?: string
  error?: string
}

export const submissionsApi = createApi({
  reducerPath: 'submissionsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/submissions',
    prepareHeaders: (headers, { getState }) => {
      // Get token from Redux state
      const token = (getState() as RootState).auth.token
      
      // If we have a token, add it to headers
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
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

        return {
          url: '',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['Submission'],
    }),
    getSubmissions: builder.query<GetSubmissionsResponse, { 
      type?: string
      limit?: number
      offset?: number
    }>({
      query: ({ type, limit = 50, offset = 0 }) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        })
        
        if (type) {
          params.append('type', type)
        }
        
        return `?${params}`
      },
      providesTags: ['Submission'],
    }),
    deleteSubmission: builder.mutation<DeleteSubmissionResponse, string>({
      query: (id) => ({
        url: `?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Submission'],
    }),
  }),
})

export const { 
  useSubmitFormMutation, 
  useGetSubmissionsQuery,
  useLazyGetSubmissionsQuery,
  useDeleteSubmissionMutation
} = submissionsApi