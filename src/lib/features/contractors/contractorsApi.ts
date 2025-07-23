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
  language?: string | null
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
  language?: string
}

export interface UpdateContractorRequest {
  id: string
  firstName: string
  lastName: string
  email: string
  code: string
  rate?: string
  companyName?: string
  language?: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ContractorsResponse {
  contractors: Contractor[]
  pagination?: PaginationInfo | null
  meta: {
    limit: number | null
    offset: number | null
    fetchAll?: boolean
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

export interface ContractorLimitResponse {
  canAdd: boolean
  currentCount: number
  limit: number
  membershipLevel: string | null
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
    getContractors: builder.query<ContractorsResponse, { search?: string; page?: number; pageSize?: number; limit?: number; offset?: number; fetchAll?: boolean }>({
      query: ({ search, page, pageSize, limit, offset, fetchAll } = {}) => {
        const params = new URLSearchParams()
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else {
          // Use page/pageSize if provided, otherwise fall back to limit/offset
          if (page !== undefined && pageSize !== undefined) {
            params.append('page', page.toString())
            params.append('pageSize', pageSize.toString())
          } else {
            params.append('limit', (limit || 50).toString())
            params.append('offset', (offset || 0).toString())
          }
        }
        
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
    getContractorLimit: builder.query<ContractorLimitResponse, void>({
      query: () => 'limit',
      providesTags: ['Contractor'],
    }),
  }),
})

export const {
  useGetContractorsQuery,
  useLazyGetContractorsQuery,
  useCreateContractorMutation,
  useUpdateContractorMutation,
  useDeleteContractorMutation,
  useGetContractorLimitQuery,
} = contractorsApi

export type GetContractorsResponse = ContractorsResponse;