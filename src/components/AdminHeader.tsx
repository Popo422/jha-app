'use client'

import { useAppSelector } from '@/lib/hooks'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function AdminHeader() {
  const { admin } = useAppSelector((state) => state.auth)
  
  const adminName = admin?.name || 'Admin User'
  const initials = getInitials(adminName)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Left side - Title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Portal</h1>
        </div>

        {/* Right side - Notification and User Panel */}
        <div className="flex items-center space-x-4">
          {/* Notification Icon */}
          <Button variant="ghost" size="sm" className="relative p-2">
            <Bell className="h-5 w-5 text-gray-600" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300"></div>
          
          {/* Avatar with initials */}
          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">{initials}</span>
          </div>

          {/* User Details */}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">{adminName}</p>
            <p className="text-xs text-gray-500">{admin?.role || 'Administrator'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}