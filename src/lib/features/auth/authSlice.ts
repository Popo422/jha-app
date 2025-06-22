import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  email: string
  name?: string
}

interface Contractor {
  id: string
  name: string
  code: string
}

interface Admin {
  id: string
  employeeId: string
  name: string
  role: string
}

interface LoginResponse {
  user: User
  contractor: Contractor
  token: string
}

interface AdminLoginResponse {
  admin: Admin
  token: string
  isAdmin: boolean
}

interface AuthState {
  user: User | null
  contractor: Contractor | null
  admin: Admin | null
  token: string | null
  adminToken: string | null
  isAuthenticated: boolean
  isAdminAuthenticated: boolean
  isLoading: boolean
}


const initialState: AuthState = {
  user: null,
  contractor: null,
  admin: null,
  token: null,
  adminToken: null,
  isAuthenticated: false,
  isAdminAuthenticated: false,
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    loginSuccess: (state, action: PayloadAction<LoginResponse>) => {
      state.user = action.payload.user
      state.contractor = action.payload.contractor
      state.token = action.payload.token
      state.isAuthenticated = true
      state.isLoading = false
      
      // Cookie is now set server-side by the API
      console.log('Login successful, cookie set by server')
    },
    loginFailure: (state) => {
      state.user = null
      state.contractor = null
      state.token = null
      state.isAuthenticated = false
      state.isLoading = false
      
      // Clear auth cookie
      if (typeof window !== 'undefined') {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    },
    logout: (state) => {
      state.user = null
      state.contractor = null
      state.token = null
      state.isAuthenticated = false
      state.isLoading = false
      
      // Clear auth cookie
      if (typeof window !== 'undefined') {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    },
    restoreAuth: (state, action: PayloadAction<{ user: User; contractor: Contractor; token: string }>) => {
      state.user = action.payload.user
      state.contractor = action.payload.contractor
      state.token = action.payload.token
      state.isAuthenticated = true
    },
    adminLoginSuccess: (state, action: PayloadAction<AdminLoginResponse>) => {
      state.admin = action.payload.admin
      state.adminToken = action.payload.token
      state.isAdminAuthenticated = true
      state.isLoading = false
      
      // Cookie is set server-side by the API
      console.log('Admin login successful, cookie set by server')
    },
    adminLoginFailure: (state) => {
      state.admin = null
      state.adminToken = null
      state.isAdminAuthenticated = false
      state.isLoading = false
      
      // Clear admin auth cookie
      if (typeof window !== 'undefined') {
        document.cookie = 'adminAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    },
    adminLogout: (state) => {
      state.admin = null
      state.adminToken = null
      state.isAdminAuthenticated = false
      
      // Clear admin auth cookie
      if (typeof window !== 'undefined') {
        document.cookie = 'adminAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    },
    restoreAdminAuth: (state, action: PayloadAction<{ admin: Admin; token: string }>) => {
      state.admin = action.payload.admin
      state.adminToken = action.payload.token
      state.isAdminAuthenticated = true
    },
  },
})

export const { 
  setLoading, 
  loginSuccess, 
  loginFailure, 
  logout, 
  restoreAuth,
  adminLoginSuccess,
  adminLoginFailure,
  adminLogout,
  restoreAdminAuth
} = authSlice.actions
export default authSlice.reducer