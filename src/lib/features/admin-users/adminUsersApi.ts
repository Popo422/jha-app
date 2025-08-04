import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'super-admin'
  companyName: string
  organizationName: string
  createdAt: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AdminUsersResponse {
  adminUsers: AdminUser[]
  pagination?: PaginationInfo | null
}

export interface CreateAdminUserRequest {
  name: string
  email: string
  password: string
  role: 'admin' | 'super-admin'
  companyName?: string
}

export interface UpdateAdminUserRequest {
  id: string
  name: string
  email: string
  password?: string
  role: 'admin' | 'super-admin'
  companyName?: string
}

export interface BulkCreateAdminUsersRequest {
  adminUsers: Array<{
    name: string
    email: string
    password?: string
    role?: 'admin' | 'super-admin'
    companyName?: string
  }>
}

export interface BulkCreateAdminUsersResponse {
  success: boolean
  adminUsers: AdminUser[]
  message: string
  created: number
  skipped?: number
  warnings?: string[]
  errors?: string[]
}

export interface AdminUserResponse {
  message: string
  admin?: AdminUser
}

export const adminUsersApi = createApi({
  reducerPath: 'adminUsersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/users',
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
  tagTypes: ['AdminUser'],
  endpoints: (builder) => ({
    getAdminUsers: builder.query<AdminUsersResponse, { page?: number; pageSize?: number; fetchAll?: boolean; search?: string; authType: 'contractor' | 'admin' }>({
      query: ({ page = 1, pageSize = 50, fetchAll, search, authType } = {} as any) => {
        const params = new URLSearchParams()
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else {
          params.append('page', page.toString())
          params.append('pageSize', pageSize.toString())
        }
        
        if (search) {
          params.append('search', search)
        }
        
        params.append('authType', authType)
        
        return `?${params}`
      },
      providesTags: ['AdminUser'],
    }),
    createAdminUser: builder.mutation<AdminUserResponse, CreateAdminUserRequest>({
      query: (adminUser) => ({
        url: '',
        method: 'POST',
        body: adminUser,
      }),
      invalidatesTags: ['AdminUser'],
    }),
    bulkCreateAdminUsers: builder.mutation<BulkCreateAdminUsersResponse, BulkCreateAdminUsersRequest>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AdminUser'],
    }),
    updateAdminUser: builder.mutation<AdminUserResponse, UpdateAdminUserRequest>({
      query: ({ id, ...adminUser }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: adminUser,
      }),
      invalidatesTags: ['AdminUser'],
    }),
    deleteAdminUser: builder.mutation<AdminUserResponse, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminUser'],
    }),
  }),
})

export const {
  useGetAdminUsersQuery,
  useLazyGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useBulkCreateAdminUsersMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
} = adminUsersApi