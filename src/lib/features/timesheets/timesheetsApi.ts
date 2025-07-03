import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface TimesheetData {
  date: string
  employee: string
  company: string
  jobSite: string
  jobName?: string
  jobDescription: string
  timeSpent: string
  authType?: 'contractor' | 'admin' | 'any'
}

export interface Timesheet {
  id: string
  userId: string
  date: string
  employee: string
  company: string
  jobSite: string
  jobName?: string
  jobDescription: string
  timeSpent: string
  createdAt: string
  updatedAt: string
}

export interface TimesheetResponse {
  success: boolean
  timesheet?: Timesheet
  error?: string
}

export interface GetTimesheetsResponse {
  timesheets: Timesheet[]
  meta: {
    limit: number
    offset: number
    userId: string
  }
}

export interface DeleteTimesheetResponse {
  success: boolean
  message?: string
  error?: string
}

export interface UpdateTimesheetData {
  id: string
  date: string
  employee: string
  company: string
  jobSite: string
  jobName?: string
  jobDescription: string
  timeSpent: string
}

export interface UpdateTimesheetResponse {
  success: boolean
  timesheet?: Timesheet
  message?: string
  error?: string
}

export const timesheetsApi = createApi({
  reducerPath: 'timesheetsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/timesheet',
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
      
      // Ensure content-type is set for JSON requests
      if (!headers.get('content-type')) {
        headers.set('content-type', 'application/json')
      }
      
      return headers
    },
  }),
  tagTypes: ['Timesheet'],
  endpoints: (builder) => ({
    submitTimesheet: builder.mutation<TimesheetResponse, TimesheetData>({
      query: ({ authType, ...data }) => {
        let url = ''
        if (authType) {
          url = `?authType=${authType}`
        }
        return {
          url,
          method: 'POST',
          body: data,
        }
      },
      invalidatesTags: ['Timesheet'],
    }),
    getTimesheets: builder.query<GetTimesheetsResponse, { 
      dateFrom?: string
      dateTo?: string
      company?: string
      search?: string
      limit?: number
      offset?: number
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: ({ dateFrom, dateTo, company, search, limit = 50, offset = 0, authType }) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        })
        
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
      providesTags: ['Timesheet'],
    }),
    deleteTimesheet: builder.mutation<DeleteTimesheetResponse, { id: string, authType?: 'contractor' | 'admin' | 'any' }>({
      query: ({ id, authType }) => {
        let url = `/${id}`
        if (authType) {
          url += `?authType=${authType}`
        }
        return {
          url,
          method: 'DELETE',
        }
      },
      invalidatesTags: ['Timesheet'],
    }),
    updateTimesheet: builder.mutation<UpdateTimesheetResponse, UpdateTimesheetData & { authType?: 'contractor' | 'admin' | 'any' }>({
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
      invalidatesTags: ['Timesheet'],
    }),
  }),
})

export const { 
  useSubmitTimesheetMutation, 
  useGetTimesheetsQuery,
  useLazyGetTimesheetsQuery,
  useDeleteTimesheetMutation,
  useUpdateTimesheetMutation
} = timesheetsApi