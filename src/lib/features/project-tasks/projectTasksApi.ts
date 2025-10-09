import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ProjectTask {
  id: string
  projectId: string
  taskNumber: number
  name: string
  durationDays?: number
  startDate?: string
  endDate?: string
  predecessors?: string
  progress: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectTaskRequest {
  projectId: string
  name: string
  durationDays?: number
  startDate?: string
  endDate?: string
  predecessors?: string
  progress?: number
}

export interface UpdateProjectTaskRequest {
  id: string
  name?: string
  durationDays?: number
  startDate?: string
  endDate?: string
  predecessors?: string
  progress?: number
}

export interface BulkImportTasksRequest {
  projectId: string
  tasks: Array<{
    taskNumber: number
    name: string
    durationDays?: number
    startDate?: string
    endDate?: string
    predecessors?: string
    progress?: number
  }>
  replaceExisting?: boolean
}

export interface UploadScheduleResponse {
  success: boolean
  fileUrl: string
  filename: string
  message: string
  nextStep: {
    endpoint: string
    method: string
    body: {
      fileUrl: string
      projectId: string
    }
  }
}

export interface ExtractTasksRequest {
  fileUrl: string
  projectId?: string
}

export interface ExtractTasksResponse {
  success: boolean
  extractedTasks: Array<{
    taskNumber: number
    name: string
    durationDays?: number
    startDate?: string
    endDate?: string
    predecessors?: string
    progress?: number
  }>
  message: string
  nextStep: {
    endpoint: string
    method: string
    body: {
      projectId: string
      tasks: any[]
      replaceExisting: boolean
    }
  }
}

export interface ProjectTasksResponse {
  success: boolean
  tasks: ProjectTask[]
}

export interface ProjectTaskResponse {
  success: boolean
  task: ProjectTask
  message: string
}

export interface BulkImportResponse {
  success: boolean
  message: string
  importedCount: number
  totalProvided: number
  errors?: string[]
  tasks: ProjectTask[]
}

export interface DeleteTaskResponse {
  success: boolean
  message: string
}

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/admin/project-tasks',
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json')
    return headers
  },
})

export const projectTasksApi = createApi({
  reducerPath: 'projectTasksApi',
  baseQuery,
  tagTypes: ['ProjectTask'],
  endpoints: (builder) => ({
    // Get all tasks for a project
    getProjectTasks: builder.query<ProjectTasksResponse, { projectId: string }>({
      query: ({ projectId }) => ({
        url: '',
        params: { projectId },
      }),
      providesTags: (result, error, { projectId }) => 
        result?.tasks
          ? [
              ...result.tasks.map(({ id }) => ({ type: 'ProjectTask' as const, id })),
              { type: 'ProjectTask', id: `PROJECT_${projectId}` },
            ]
          : [{ type: 'ProjectTask', id: `PROJECT_${projectId}` }],
    }),

    // Create a single task
    createProjectTask: builder.mutation<ProjectTaskResponse, CreateProjectTaskRequest>({
      query: (task) => ({
        url: '',
        method: 'POST',
        body: task,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectTask', id: `PROJECT_${projectId}` },
      ],
    }),

    // Update a task
    updateProjectTask: builder.mutation<ProjectTaskResponse, UpdateProjectTaskRequest>({
      query: ({ id, ...task }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: task,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ProjectTask', id },
      ],
    }),

    // Delete a task
    deleteProjectTask: builder.mutation<DeleteTaskResponse, { id: string; projectId: string }>({
      query: ({ id }) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectTask', id: `PROJECT_${projectId}` },
      ],
    }),

    // Upload schedule file
    uploadSchedule: builder.mutation<UploadScheduleResponse, { file?: File; url?: string }>({
      queryFn: async (arg, api, extraOptions, baseQuery) => {
        const { file, url } = arg as { file?: File; url?: string }
        const formData = new FormData()
        if (file) formData.append('file', file)
        if (url) formData.append('url', url)
        
        try {
          const response = await fetch('/api/admin/project-tasks/upload-schedule', {
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

    // Extract tasks from uploaded file using AI
    extractTasks: builder.mutation<ExtractTasksResponse, ExtractTasksRequest>({
      query: (request) => ({
        url: '/extract-tasks',
        method: 'POST',
        body: request,
      }),
    }),

    // Bulk import tasks
    bulkImportTasks: builder.mutation<BulkImportResponse, BulkImportTasksRequest>({
      query: (request) => ({
        url: '/bulk-import',
        method: 'POST',
        body: request,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectTask', id: `PROJECT_${projectId}` },
      ],
    }),
  }),
})

export const {
  useGetProjectTasksQuery,
  useCreateProjectTaskMutation,
  useUpdateProjectTaskMutation,
  useDeleteProjectTaskMutation,
  useUploadScheduleMutation,
  useExtractTasksMutation,
  useBulkImportTasksMutation,
} = projectTasksApi