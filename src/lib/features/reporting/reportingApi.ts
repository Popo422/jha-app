import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface Employee {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
}

export interface ChartDataPoint {
  date: string;
  totalHours: number;
  employees: string[];
}

export interface ReportingData {
  chartData: ChartDataPoint[];
  rawData: any[];
  employees: Employee[];
}

export interface GetReportingDataParams {
  companyId: string;
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  authType?: 'admin';
}

export const reportingApi = createApi({
  reducerPath: 'reportingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/reporting',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      
      // Admin API so use admin token
      if (state.auth.adminToken && state.auth.isAdminAuthenticated) {
        headers.set('Authorization', `AdminBearer ${state.auth.adminToken}`)
      }
      
      // Ensure content-type is set for JSON requests
      if (!headers.get('content-type')) {
        headers.set('content-type', 'application/json')
      }
      
      return headers
    },
  }),
  tagTypes: ['ReportingData'],
  endpoints: (builder) => ({
    getReportingData: builder.query<ReportingData, GetReportingDataParams>({
      query: ({ companyId, startDate, endDate, employeeIds, authType = 'admin' }) => {
        const params = new URLSearchParams({
          companyId,
          startDate,
          endDate,
        })
        
        if (employeeIds && employeeIds.length > 0) {
          params.append('employeeIds', employeeIds.join(','))
        }
        
        if (authType) {
          params.append('authType', authType)
        }
        
        return `?${params}`
      },
      providesTags: ['ReportingData'],
    }),
  }),
})

export const { 
  useGetReportingDataQuery,
  useLazyGetReportingDataQuery
} = reportingApi