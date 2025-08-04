import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Module {
  id: string
  name: string
  description: string
}

export interface LastUpdatedInfo {
  at: string | null
  by: string | null
  byUserId: string | null
}

export interface ModulesResponse {
  success: boolean
  enabledModules: string[]
  availableModules: Module[]
  lastUpdated: LastUpdatedInfo
}

export interface UpdateModulesRequest {
  enabledModules: string[]
}

export interface UpdateModulesResponse {
  success: boolean
  enabledModules: string[]
  message: string
}

export const modulesApi = createApi({
  reducerPath: 'modulesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/modules',
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
  tagTypes: ['Modules'],
  // Keep data cached for 5 minutes since modules don't change frequently
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getModules: builder.query<ModulesResponse, void>({
      query: () => '',
      providesTags: ['Modules'],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),
    updateModules: builder.mutation<UpdateModulesResponse, UpdateModulesRequest>({
      query: (data) => ({
        url: '',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Modules'],
    }),
  }),
})

export const {
  useGetModulesQuery,
  useUpdateModulesMutation,
} = modulesApi