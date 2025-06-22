'use client'

import { useAuth } from '@/providers/AuthProvider'
import { usePathname } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const publicRoutes = ['/login']

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth()
  const pathname = usePathname()

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>
  }
  // Allow admin routes (they have their own protection)
  if (pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect happens in AuthProvider, but show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}