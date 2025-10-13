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
  type?: string | null
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
  type?: string
  projectIds?: string[]
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
  type?: string
  projectIds?: string[]
}

export interface SyncToProcoreRequest {
  contractorIds: string[]
}

export interface SyncToProcoreResponse {
  success: boolean
  message: string
  results: Array<{
    contractorId: string
    name: string
    status: 'exists' | 'created' | 'error'
    procorePartyId?: string
    message?: string
    error?: string
  }>
  errors?: Array<{
    contractorId: string
    name: string
    status: 'error'
    error: string
  }>
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
  tagTypes: ['Contractor'],
  endpoints: (builder) => ({
    getContractors: builder.query<ContractorsResponse, { search?: string; company?: string; page?: number; pageSize?: number; limit?: number; offset?: number; fetchAll?: boolean; authType: 'contractor' | 'admin'; projectId?: string }>({
      query: ({ search, company, page, pageSize, limit, offset, fetchAll, authType, projectId } = {} as any) => {
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
        
        if (company) {
          params.append('company', company)
        }
        
        if (projectId) {
          params.append('projectId', projectId)
        }
        
        params.append('authType', authType)
        
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
    bulkCreateContractors: builder.mutation<
      { success: boolean; contractors: Contractor[]; created: number; skipped: number; errors?: string[]; warnings?: string[] },
      { contractors: Array<{ firstName: string; lastName: string; email: string; rate?: string; companyName?: string; language?: string; type?: string }> }
    >({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Contractor'],
    }),
    syncToProcore: builder.mutation<SyncToProcoreResponse, SyncToProcoreRequest>({
      query: (data) => ({
        url: 'sync-procore',
        method: 'POST',
        body: data,
      }),
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
  useBulkCreateContractorsMutation,
  useSyncToProcoreMutation,
} = contractorsApi

export type GetContractorsResponse = ContractorsResponse;