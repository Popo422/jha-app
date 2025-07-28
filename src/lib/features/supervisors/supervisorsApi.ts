import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Supervisor {
  id: string
  name: string
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface SupervisorsResponse {
  supervisors: Supervisor[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  } | null
}

export interface CreateSupervisorRequest {
  name: string
}

export interface UpdateSupervisorRequest {
  id: string
  name: string
}

export const supervisorsApi = createApi({
  reducerPath: 'supervisorsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/supervisors',
    prepareHeaders: (headers) => {
      // Get token from cookie for admin requests
      if (typeof window !== 'undefined') {
        const adminToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminAuthToken='))
          ?.split('=')[1]
        
        const contractorToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('contractorAuthToken='))
          ?.split('=')[1]
        
        const token = adminToken || contractorToken
        
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
      return headers
    },
  }),
  tagTypes: ['Supervisor'],
  endpoints: (builder) => ({
    getSupervisors: builder.query<SupervisorsResponse, {
      page?: number
      pageSize?: number
      search?: string
      fetchAll?: boolean
    }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        
        if (params.page) searchParams.append('page', params.page.toString())
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString())
        if (params.search) searchParams.append('search', params.search)
        if (params.fetchAll) searchParams.append('fetchAll', 'true')
        
        return `?${searchParams.toString()}`
      },
      providesTags: ['Supervisor'],
    }),
    createSupervisor: builder.mutation<{ message: string; supervisor?: Supervisor }, CreateSupervisorRequest>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Supervisor'],
    }),
    updateSupervisor: builder.mutation<{ message: string; supervisor?: Supervisor }, UpdateSupervisorRequest>({
      query: ({ id, ...data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Supervisor'],
    }),
    deleteSupervisor: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supervisor'],
    }),
  }),
})

export const {
  useGetSupervisorsQuery,
  useCreateSupervisorMutation,
  useUpdateSupervisorMutation,
  useDeleteSupervisorMutation,
} = supervisorsApi