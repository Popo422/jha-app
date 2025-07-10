import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface LoginRequest {
  contractorCode: string
}

export interface AdminLoginRequest {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  name?: string
}

export interface Contractor {
  id: string
  name: string
  companyName: string
  code: string
  companyId: string
  companyLogoUrl: string | null
}

export interface Admin {
  id: string
  email: string
  name: string
  role: string
  companyId: string
  companyName: string
  companyLogoUrl: string | null
}

export interface LoginResponse {
  user: User
  contractor: Contractor
  token: string
}

export interface AdminLoginResponse {
  admin: Admin
  token: string
  isAdmin: boolean
}

export interface ValidateTokenRequest {
  token: string
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/auth',
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    validateToken: builder.mutation<LoginResponse, ValidateTokenRequest>({
      query: (data) => ({
        url: '/validate',
        method: 'POST',
        body: data,
      }),
    }),
    adminLogin: builder.mutation<AdminLoginResponse, AdminLoginRequest>({
      query: (credentials) => ({
        url: '/admin/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    validateAdminToken: builder.mutation<AdminLoginResponse, ValidateTokenRequest>({
      query: (data) => ({
        url: '/admin/validate',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})

export const { 
  useLoginMutation,
  useValidateTokenMutation,
  useAdminLoginMutation,
  useValidateAdminTokenMutation
} = authApi