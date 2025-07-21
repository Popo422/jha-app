import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Subcontractor {
  id: string
  name: string
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface CreateSubcontractorRequest {
  name: string
}

export interface UpdateSubcontractorRequest {
  id: string
  name: string
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

export const subcontractorsApi = createApi({
  reducerPath: 'subcontractorsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/subcontractors',
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
  tagTypes: ['Subcontractor'],
  endpoints: (builder) => ({
    getSubcontractors: builder.query<SubcontractorsResponse, { search?: string; page?: number; pageSize?: number }>({
      query: ({ search, page = 1, pageSize = 50 } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        if (search) {
          params.append('search', search)
        }
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
  }),
})

export const {
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useDeleteSubcontractorMutation,
} = subcontractorsApi