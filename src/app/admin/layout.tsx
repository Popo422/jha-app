'use client'

import { usePathname } from 'next/navigation'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import AdminSidebar from '@/components/AdminSidebar'
import AdminHeader from '@/components/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't apply layout to login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <AdminProtectedRoute>
      <div className="h-screen flex bg-gray-50">
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader />
          
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}