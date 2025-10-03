import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Project {
  id: string
  name: string
  projectManager: string
  location: string
  companyId: string
  projectCost?: string
  subcontractorCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  projectManager: string
  location: string
  projectCost?: string
}

export interface UpdateProjectRequest {
  id: string
  name: string
  projectManager: string
  location: string
  projectCost?: string
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

export interface SyncToProcoreRequest {
  projectIds: string[]
  createInProcore?: boolean
}

export interface SyncToProcoreResponse {
  success: boolean
  message: string
  results: Array<{
    projectId: string
    projectName: string
    procoreProjectId?: string
    procoreProjectName?: string
    status: 'created' | 'matched' | 'no_match'
    suggestion?: string
  }>
  errors?: Array<{
    projectId: string
    projectName: string
    error: string
  }>
}

export interface CheckProcoreRequest {
  projectIds?: string[]
}

export interface CheckProcoreResponse {
  success: boolean
  summary: {
    total: number
    found: number
    notFound: number
    needsReview: number
  }
  results: Array<{
    projectId: string
    projectName: string
    location: string
    projectManager: string
    procoreStatus: 'found' | 'not_found' | 'multiple_matches'
    procoreProject?: {
      id: string
      name: string
      address: string
      project_number?: string
    }
    procoreMatches?: Array<{
      id: string
      name: string
      address: string
      project_number?: string
      similarity: number
    }>
    recommendation: 'use_existing' | 'create_new' | 'manual_review'
  }>
}

export interface BulkProjectData {
  name: string
  location: string
  projectManager?: string
  projectCost?: string
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
    getProjects: builder.query<ProjectsResponse, { search?: string; projectManager?: string; location?: string; page?: number; pageSize?: number; authType: 'contractor' | 'admin'; subcontractorName?: string }>({
      query: ({ search, projectManager, location, page = 1, pageSize = 50, authType, subcontractorName } = {} as any) => {
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
        if (subcontractorName) {
          params.append('subcontractorName', subcontractorName)
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
    syncToProcore: builder.mutation<SyncToProcoreResponse, SyncToProcoreRequest>({
      query: (data) => ({
        url: 'sync-procore',
        method: 'POST',
        body: data,
      }),
    }),
    checkProcore: builder.mutation<CheckProcoreResponse, CheckProcoreRequest>({
      query: (data) => ({
        url: 'check-procore',
        method: 'POST',
        body: data,
      }),
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
  useSyncToProcoreMutation,
  useCheckProcoreMutation,
} = projectsApi