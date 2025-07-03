'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppDispatch } from '@/lib/hooks'
import { restoreAdminAuth, adminLoginFailure } from '@/lib/features/auth/authSlice'
import { AdminAuth } from '@/types/auth'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

const adminPublicRoutes = ['/admin/login']

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()

  useEffect(() => {
    const checkAdminAuth = async () => {
      // Allow admin public routes
      if (adminPublicRoutes.includes(pathname)) {
        setIsLoading(false)
        return
      }

      try {
        // Check for admin auth token in cookies
        const cookies = document.cookie
        const adminTokenMatch = cookies.match(/adminAuthToken=([^;]+)/)
        
        if (!adminTokenMatch) {
          router.push('/admin/login')
          return
        }

        const token = adminTokenMatch[1]
        
        // Validate token with server
        const response = await fetch('/api/auth/admin/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          const data: AdminAuth = await response.json()
          setIsAuthenticated(data.isAdmin)
          
          // Store admin auth data in Redux store
          if (data.isAdmin && data.admin && data.token) {
            dispatch(restoreAdminAuth({
              admin: data.admin,
              token: data.token
            }))
            console.log('Admin auth restored in Redux store')
          }
        } else {
          // Invalid token, redirect to login
          dispatch(adminLoginFailure())
          document.cookie = 'adminAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Admin auth check error:', error)
        dispatch(adminLoginFailure())
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAuth()
  }, [pathname, router])

  // Allow admin public routes
  if (adminPublicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Show access denied if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to admin login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}