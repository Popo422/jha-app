import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Contractor {
  id: string
  firstName: string
  lastName: string
  email: string
  companyId: string
  code: string
  rate?: string | null
  companyName?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContractorRequest {
  firstName: string
  lastName: string
  email: string
  code: string
  rate?: string
  companyName?: string
}

export interface UpdateContractorRequest {
  id: string
  firstName: string
  lastName: string
  email: string
  code: string
  rate?: string
  companyName?: string
}

export interface ContractorsResponse {
  contractors: Contractor[]
  meta: {
    limit: number
    offset: number
    companyId: string
  }
}

export interface ContractorResponse {
  success: boolean
  contractor: Contractor
}

export interface DeleteContractorResponse {
  success: boolean
  message: string
}

export const contractorsApi = createApi({
  reducerPath: 'contractorsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/contractors',
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
  tagTypes: ['Contractor'],
  endpoints: (builder) => ({
    getContractors: builder.query<ContractorsResponse, { search?: string; limit?: number; offset?: number }>({
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
      providesTags: ['Contractor'],
    }),
    createContractor: builder.mutation<ContractorResponse, CreateContractorRequest>({
      query: (contractor) => ({
        url: '',
        method: 'POST',
        body: contractor,
      }),
      invalidatesTags: ['Contractor'],
    }),
    updateContractor: builder.mutation<ContractorResponse, UpdateContractorRequest>({
      query: (contractor) => ({
        url: '',
        method: 'PUT',
        body: contractor,
      }),
      invalidatesTags: ['Contractor'],
    }),
    deleteContractor: builder.mutation<DeleteContractorResponse, string>({
      query: (id) => ({
        url: `?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contractor'],
    }),
  }),
})

export const {
  useGetContractorsQuery,
  useCreateContractorMutation,
  useUpdateContractorMutation,
  useDeleteContractorMutation,
} = contractorsApi