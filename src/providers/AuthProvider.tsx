'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { restoreAuth, loginFailure } from '@/lib/features/auth/authSlice'

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    const validateAuth = async () => {
      try {
        // Get token from cookie
        const getCookie = (name: string) => {
          if (typeof document === 'undefined') return null
          const value = `; ${document.cookie}`
          const parts = value.split(`; ${name}=`)
          if (parts.length === 2) return parts.pop()?.split(';').shift()
          return null
        }

        const token = getCookie('authToken')
        console.log('🔍 Checking auth token:', token ? 'Found' : 'Missing')

        if (!token) {
          console.log('❌ No token found, redirecting to login')
          dispatch(loginFailure())
          router.push('/login')
          setIsLoading(false)
          return
        }

        // Validate token with API
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Token validated successfully')
          
          // Restore auth state
          dispatch(restoreAuth({
            user: data.user,
            contractor: data.contractor,
            token: data.token
          }))
        } else {
          console.log('❌ Token validation failed, redirecting to login')
          dispatch(loginFailure())
          router.push('/login')
        }
      } catch (error) {
        console.error('🔥 Auth validation error:', error)
        dispatch(loginFailure())
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    // Only validate if we're not already authenticated
    if (!isAuthenticated) {
      validateAuth()
    } else {
      setIsLoading(false)
    }
  }, [dispatch, router, isAuthenticated])

  const authValue = {
    isLoading,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}