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

export interface AdminUserResponse {
  message: string
  admin?: AdminUser
}

export const adminUsersApi = createApi({
  reducerPath: 'adminUsersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/users',
    prepareHeaders: (headers) => {
      // Get admin token from cookie
      if (typeof window !== 'undefined') {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminAuthToken='))
          ?.split('=')[1]
        
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
      return headers
    },
  }),
  tagTypes: ['AdminUser'],
  endpoints: (builder) => ({
    getAdminUsers: builder.query<AdminUsersResponse, { page?: number; pageSize?: number; fetchAll?: boolean }>({
      query: ({ page = 1, pageSize = 50, fetchAll } = {}) => {
        const params = new URLSearchParams()
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else {
          params.append('page', page.toString())
          params.append('pageSize', pageSize.toString())
        }
        
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
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
} = adminUsersApi