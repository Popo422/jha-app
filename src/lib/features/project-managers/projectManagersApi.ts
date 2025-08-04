import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ProjectManager {
  id?: number
  name: string
  email: string
  phone?: string | null
  companyId?: string
  createdAt?: string
  updatedAt?: string
}

export interface SaveProjectManagersRequest {
  projectManagers: Array<{
    name: string
    email: string
    phone?: string | null
  }>
}

export interface SaveProjectManagersResponse {
  success: boolean
  projectManagers: ProjectManager[]
  message?: string
  errors?: string[]
  warnings?: string[]
  skipped?: number
}

export const projectManagersApi = createApi({
  reducerPath: 'projectManagersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      // Get token from cookie for admin requests
      if (typeof window !== 'undefined') {
        const adminToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminAuthToken='))
          ?.split('=')[1]
        
        if (adminToken) {
          headers.set('Authorization', `Bearer ${adminToken}`)
        }
      }
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['ProjectManager'],
  endpoints: (builder) => ({
    saveProjectManagers: builder.mutation<SaveProjectManagersResponse, SaveProjectManagersRequest>({
      query: (data) => ({
        url: '/project-managers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ProjectManager'],
    }),
    getProjectManagers: builder.query<ProjectManager[], void>({
      query: () => '/project-managers',
      providesTags: ['ProjectManager'],
    }),
  }),
})

export const {
  useSaveProjectManagersMutation,
  useGetProjectManagersQuery,
} = projectManagersApi