import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface DailyLog {
  id: string
  projectId: string
  companyId: string
  taskName: string
  startDate?: string
  endDate?: string
  predecessor?: string
  progress: string
  logDate: string
  notes?: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface CreateDailyLogRequest {
  projectId: string
  taskName: string
  startDate?: string
  endDate?: string
  predecessor?: string
  progress?: number
  logDate: string
  notes?: string
}

export interface UpdateDailyLogRequest {
  id: string
  taskName?: string
  startDate?: string
  endDate?: string
  predecessor?: string
  progress?: number
  logDate?: string
  notes?: string
}

export interface DailyLogsParams {
  projectId: string
  page?: number
  pageSize?: number
  search?: string
  startDate?: string
  endDate?: string
}

export interface DailyLogsResponse {
  success: boolean
  logs: DailyLog[]
  totalCount: number
  page: number
  pageSize: number
}

export interface DailyLogResponse {
  success: boolean
  log: DailyLog
  message: string
}

export interface DeleteDailyLogResponse {
  success: boolean
  message: string
}

function cleanParams(params: Record<string, any>) {
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value
    }
  }
  return cleaned
}

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/admin/daily-logs',
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json')
    return headers
  },
})

export const dailyLogsApi = createApi({
  reducerPath: 'dailyLogsApi',
  baseQuery,
  tagTypes: ['DailyLog'],
  endpoints: (builder) => ({
    // Get all daily logs for a project
    getDailyLogs: builder.query<DailyLogsResponse, DailyLogsParams>({
      query: (params) => ({
        url: '',
        params: cleanParams(params),
      }),
      providesTags: (result, error, { projectId }) => 
        result?.logs
          ? [
              ...result.logs.map(({ id }) => ({ type: 'DailyLog' as const, id })),
              { type: 'DailyLog', id: `PROJECT_${projectId}` },
            ]
          : [{ type: 'DailyLog', id: `PROJECT_${projectId}` }],
    }),

    // Get a single daily log
    getDailyLog: builder.query<DailyLogResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/${id}`,
      }),
      providesTags: (result, error, { id }) => [{ type: 'DailyLog', id }],
    }),

    // Create a daily log
    createDailyLog: builder.mutation<DailyLogResponse, CreateDailyLogRequest>({
      query: (log) => ({
        url: '',
        method: 'POST',
        body: log,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'DailyLog', id: `PROJECT_${projectId}` },
      ],
    }),

    // Update a daily log
    updateDailyLog: builder.mutation<DailyLogResponse, UpdateDailyLogRequest>({
      query: ({ id, ...log }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: log,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'DailyLog', id },
      ],
    }),

    // Delete a daily log
    deleteDailyLog: builder.mutation<DeleteDailyLogResponse, { id: string; projectId: string }>({
      query: ({ id }) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'DailyLog', id: `PROJECT_${projectId}` },
      ],
    }),

    // Bulk import daily logs
    bulkImportDailyLogs: builder.mutation<any, { projectId: string; logs: any[] }>({
      query: ({ projectId, logs }) => ({
        url: '/bulk-import',
        method: 'POST',
        body: { projectId, logs },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'DailyLog', id: `PROJECT_${projectId}` },
      ],
    }),
  }),
})

export const {
  useGetDailyLogsQuery,
  useGetDailyLogQuery,
  useCreateDailyLogMutation,
  useUpdateDailyLogMutation,
  useDeleteDailyLogMutation,
  useBulkImportDailyLogsMutation,
} = dailyLogsApi