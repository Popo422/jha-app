'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { restoreAuth, loginFailure } from '@/lib/features/auth/authSlice'
import { useTranslation } from 'react-i18next'

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
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const { i18n } = useTranslation()

  useEffect(() => {
    const validateAuth = async () => {
      // Skip auth validation for admin routes
      console.log("pathname:", pathname.startsWith('/onboarding'))
      if (pathname.startsWith('/admin') || pathname.startsWith('/onboarding')) {
        setIsLoading(false)
        return
      }

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
          
          // Apply contractor's language preference
          if (data.contractor?.language) {
            console.log(`🌐 Setting language to: ${data.contractor.language}`)
            await i18n.changeLanguage(data.contractor.language)
          }
          
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
  }, [dispatch, router, pathname, isAuthenticated])

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