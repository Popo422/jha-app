import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface TimesheetData {
  date: string
  employee: string
  company: string
  projectName: string
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
  projectName: string
  jobDescription: string
  timeSpent: string
  createdAt: string
  updatedAt: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedByName?: string
  approvedAt?: string
  rejectionReason?: string
}

export interface TimesheetResponse {
  success: boolean
  timesheet?: Timesheet
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

export interface GetTimesheetsResponse {
  timesheets: Timesheet[]
  contractorRates?: Record<string, string>
  pagination?: PaginationInfo | null
  meta: {
    limit: number | null
    offset: number | null
    fetchAll?: boolean
    userId: string
  }
}

export interface DeleteTimesheetResponse {
  success: boolean
  message?: string
  error?: string
}

export interface TimesheetAggregate {
  employee: string
  company: string
  totalHours: number
  totalCost: number
  entriesCount: number
  projectNames: string
  latestDate: string
}

export interface GetTimesheetAggregatesResponse {
  aggregates: TimesheetAggregate[]
  meta: {
    isAdmin: boolean
    userId: string | null
    approvedOnly: boolean
  }
}

export interface UpdateTimesheetData {
  id: string
  date: string
  employee: string
  company: string
  projectName: string
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
      status?: string
      jobName?: string
      employees?: string
      page?: number
      pageSize?: number
      limit?: number
      offset?: number
      fetchAll?: boolean
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: ({ dateFrom, dateTo, company, search, status, jobName, employees, page, pageSize, limit, offset, fetchAll, authType }) => {
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
        if (status) {
          params.append('status', status)
        }
        if (jobName) {
          params.append('jobName', jobName)
        }
        if (employees) {
          params.append('employees', employees)
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
    getTimesheetAggregates: builder.query<GetTimesheetAggregatesResponse, { 
      dateFrom?: string
      dateTo?: string
      company?: string
      search?: string
      jobName?: string
      employees?: string
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: ({ dateFrom, dateTo, company, search, jobName, employees, authType }) => {
        const params = new URLSearchParams()
        
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
        if (jobName) {
          params.append('jobName', jobName)
        }
        if (employees) {
          params.append('employees', employees)
        }
        if (authType) {
          params.append('authType', authType)
        }
        
        return `aggregates?${params}`
      },
      providesTags: ['Timesheet'],
    }),
  }),
})

export const { 
  useSubmitTimesheetMutation, 
  useGetTimesheetsQuery,
  useLazyGetTimesheetsQuery,
  useDeleteTimesheetMutation,
  useUpdateTimesheetMutation,
  useGetTimesheetAggregatesQuery,
  useLazyGetTimesheetAggregatesQuery
} = timesheetsApi