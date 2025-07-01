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
  endpoints: (builder) => ({
    getCompanyModules: builder.query<CompanyModulesResponse, void>({
      query: () => '/modules',
      providesTags: ['CompanyModules'],
    }),
  }),
})

export const {
  useGetCompanyModulesQuery,
} = companyApi