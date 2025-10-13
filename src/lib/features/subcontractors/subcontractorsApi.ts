import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Subcontractor {
  id: string
  name: string
  contractAmount?: string
  companyId: string
  projectId?: string // Legacy field for backward compatibility
  projectIds?: string[]
  projectName?: string // Legacy field for backward compatibility  
  projectNames?: string[]
  foreman?: string
  createdAt: string
  updatedAt: string
}

export interface CreateSubcontractorRequest {
  name: string
  contractAmount?: string
  projectId?: string // Legacy field for backward compatibility
  projectIds?: string[]
  foreman?: string
}

export interface UpdateSubcontractorRequest {
  id: string
  name: string
  contractAmount?: string
  projectId?: string // Legacy field for backward compatibility
  projectIds?: string[]
  foreman?: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface SubcontractorsResponse {
  subcontractors: Subcontractor[]
  pagination?: PaginationInfo
}

export interface SubcontractorResponse {
  success: boolean
  subcontractor: Subcontractor
}

export interface DeleteSubcontractorResponse {
  success: boolean
  message: string
}

export interface BulkSubcontractorData {
  name: string
  contractAmount?: string
  projectId?: string
  foreman?: string
}

export interface BulkCreateSubcontractorsRequest {
  subcontractors: BulkSubcontractorData[]
}

export interface BulkCreateSubcontractorsResponse {
  success: boolean
  subcontractors: Subcontractor[]
  created: number
  skipped: number
  errors?: string[]
  warnings?: string[]
}

export const subcontractorsApi = createApi({
  reducerPath: 'subcontractorsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/subcontractors',
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
  tagTypes: ['Subcontractor'],
  endpoints: (builder) => ({
    getSubcontractors: builder.query<SubcontractorsResponse, { search?: string; page?: number; pageSize?: number; authType: 'contractor' | 'admin'; projectId?: string }>({
      query: ({ search, page = 1, pageSize = 50, authType, projectId } = {} as any) => {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        if (search) {
          params.append('search', search)
        }
        if (projectId) {
          params.append('projectId', projectId)
        }
        params.append('authType', authType)
        return `?${params}`
      },
      providesTags: ['Subcontractor'],
    }),
    createSubcontractor: builder.mutation<SubcontractorResponse, CreateSubcontractorRequest>({
      query: (subcontractor) => ({
        url: '',
        method: 'POST',
        body: subcontractor,
      }),
      invalidatesTags: ['Subcontractor'],
    }),
    updateSubcontractor: builder.mutation<SubcontractorResponse, UpdateSubcontractorRequest>({
      query: (subcontractor) => ({
        url: '',
        method: 'PUT',
        body: subcontractor,
      }),
      invalidatesTags: ['Subcontractor'],
    }),
    deleteSubcontractor: builder.mutation<DeleteSubcontractorResponse, string>({
      query: (id) => ({
        url: `?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subcontractor'],
    }),
    bulkCreateSubcontractors: builder.mutation<BulkCreateSubcontractorsResponse, BulkCreateSubcontractorsRequest>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subcontractor'],
    }),
  }),
})

export const {
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useDeleteSubcontractorMutation,
  useBulkCreateSubcontractorsMutation,
} = subcontractorsApi