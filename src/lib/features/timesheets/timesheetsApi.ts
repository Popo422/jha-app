import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface TimesheetData {
  date: string
  employee: string
  company: string
  jobSite: string
  jobDescription: string
  timeSpent: string
}

export interface Timesheet {
  id: string
  userId: string
  date: string
  employee: string
  company: string
  jobSite: string
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

export const timesheetsApi = createApi({
  reducerPath: 'timesheetsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/timesheet',
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
  tagTypes: ['Timesheet'],
  endpoints: (builder) => ({
    submitTimesheet: builder.mutation<TimesheetResponse, TimesheetData>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Timesheet'],
    }),
    getTimesheets: builder.query<GetTimesheetsResponse, { 
      limit?: number
      offset?: number
    }>({
      query: ({ limit = 50, offset = 0 }) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        })
        
        return `?${params}`
      },
      providesTags: ['Timesheet'],
    }),
    deleteTimesheet: builder.mutation<DeleteTimesheetResponse, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Timesheet'],
    }),
  }),
})

export const { 
  useSubmitTimesheetMutation, 
  useGetTimesheetsQuery,
  useLazyGetTimesheetsQuery,
  useDeleteTimesheetMutation
} = timesheetsApi