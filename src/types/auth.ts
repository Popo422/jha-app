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
  language: string
  type: string
  isForeman: boolean
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

export interface AdminAuth {
  admin: Admin
  isAdmin: boolean
  token: string
}

export interface AdminJWTPayload {
  admin: Admin
  isAdmin: boolean
}

export interface AuthState {
  user: User | null
  contractor: Contractor | null
  admin: Admin | null
  token: string | null
  adminToken: string | null
  isAuthenticated: boolean
  isAdminAuthenticated: boolean
  isLoading: boolean
}