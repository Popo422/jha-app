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

export interface ProjectsResponse {
  projects: Project[]
  meta: {
    limit: number
    offset: number
    companyId: string
  }
}

export interface ProjectResponse {
  success: boolean
  project: Project
}

export interface DeleteProjectResponse {
  success: boolean
  message: string
}

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/projects',
    prepareHeaders: (headers) => {
      // Get admin token from cookie
      if (typeof window !== 'undefined') {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminAuthToken='))
          ?.split('=')[1]
        
        if (token) {
          headers.set('Authorization', `AdminBearer ${token}`)
        }
      }
      return headers
    },
  }),
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    getProjects: builder.query<ProjectsResponse, { search?: string; limit?: number; offset?: number }>({
      query: ({ search, limit = 50, offset = 0 } = {}) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        })
        if (search) {
          params.append('search', search)
        }
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
  }),
})

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi