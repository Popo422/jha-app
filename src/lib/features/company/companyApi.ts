import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface CompanyModulesResponse {
  success: boolean
  enabledModules: string[]
}

export const companyApi = createApi({
  reducerPath: 'companyApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/company',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      
      // Use regular user token for contractor requests
      if (state.auth.token && state.auth.isAuthenticated) {
        headers.set('Authorization', `Bearer ${state.auth.token}`)
      }
      
      return headers
    },
  }),
  tagTypes: ['CompanyModules'],
  // Keep data cached for 10 minutes since company modules rarely change
  keepUnusedDataFor: 600,
  endpoints: (builder) => ({
    getCompanyModules: builder.query<CompanyModulesResponse, void>({
      query: () => '/modules',
      providesTags: ['CompanyModules'],
      // Cache for 10 minutes - company modules are relatively static
      keepUnusedDataFor: 600,
    }),
  }),
})

export const {
  useGetCompanyModulesQuery,
} = companyApi