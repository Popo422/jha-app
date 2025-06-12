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

interface LoginResponse {
  user: User
  contractor: Contractor
  token: string
}

interface AuthState {
  user: User | null
  contractor: Contractor | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  contractor: null,
  token: null,
  isAuthenticated: false,
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
  },
})

export const { setLoading, loginSuccess, loginFailure, logout, restoreAuth } = authSlice.actions
export default authSlice.reducer