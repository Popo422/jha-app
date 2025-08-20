import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Project {
  id: string
  name: string
  projectManager: string
  location: string
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  projectManager: string
  location: string
}

export interface UpdateProjectRequest {
  id: string
  name: string
  projectManager: string
  location: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ProjectsResponse {
  projects: Project[]
  pagination?: PaginationInfo
}

export interface ProjectResponse {
  success: boolean
  project: Project
}

export interface DeleteProjectResponse {
  success: boolean
  message: string
}

export interface BulkProjectData {
  name: string
  location: string
  projectManager?: string
}

export interface BulkCreateProjectsRequest {
  projects: BulkProjectData[]
}

export interface BulkCreateProjectsResponse {
  success: boolean
  projects: Project[]
  created: number
  skipped: number
  errors?: string[]
  warnings?: string[]
}

export interface ProjectLimitResponse {
  canAdd: boolean
  currentCount: number
  limit: number
  membershipLevel: string | null
}

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/projects',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as any
      
      // Check for admin token first (admin has priority)
      if (state.auth?.adminToken && state.auth?.isAdminAuthenticated) {
        headers.set('Authorization', `AdminBearer ${state.auth.adminToken}`)
      }
      // Otherwise use regular user token
      else if (state.auth?.token && state.auth?.isAuthenticated) {
        headers.set('Authorization', `Bearer ${state.auth.token}`)
      }
      
      return headers
    },
  }),
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    getProjects: builder.query<ProjectsResponse, { search?: string; projectManager?: string; location?: string; page?: number; pageSize?: number; authType: 'contractor' | 'admin' }>({
      query: ({ search, projectManager, location, page = 1, pageSize = 50, authType } = {} as any) => {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        if (search) {
          params.append('search', search)
        }
        if (projectManager && projectManager !== 'all') {
          params.append('projectManager', projectManager)
        }
        if (location && location !== 'all') {
          params.append('location', location)
        }
        params.append('authType', authType)
        return `?${params}`
      },
      providesTags: ['Project'],
    }),
    createProject: builder.mutation<ProjectResponse, CreateProjectRequest>({
      query: (project) => ({
        url: '',
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<ProjectResponse, UpdateProjectRequest>({
      query: (project) => ({
        url: '',
        method: 'PUT',
        body: project,
      }),
      invalidatesTags: ['Project'],
    }),
    deleteProject: builder.mutation<DeleteProjectResponse, string>({
      query: (id) => ({
        url: `?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    bulkCreateProjects: builder.mutation<BulkCreateProjectsResponse, BulkCreateProjectsRequest>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Project'],
    }),
    getProjectLimit: builder.query<ProjectLimitResponse, void>({
      query: () => '/limit',
      providesTags: ['Project'],
    }),
  }),
})

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useBulkCreateProjectsMutation,
  useGetProjectLimitQuery,
} = projectsApi