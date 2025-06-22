'use client'

import { useAppSelector } from '@/lib/hooks'
import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

interface AdminHeaderProps {
  onMenuClick: () => void
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { admin } = useAppSelector((state) => state.auth)
  
  const adminName = admin?.name || 'Admin User'
  const initials = getInitials(adminName)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Left side - Menu button (mobile) and Title */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </Button>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Admin Portal</h1>
        </div>

        {/* Right side - Notification and User Panel */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Notification Icon */}
          <Button variant="ghost" size="sm" className="relative p-2">
            <Bell className="h-5 w-5 text-gray-600" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>
          
          {/* Avatar with initials */}
          <div className="h-8 w-8 lg:h-10 lg:w-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs lg:text-sm font-medium text-white">{initials}</span>
          </div>

          {/* User Details */}
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{adminName}</p>
            <p className="text-xs text-gray-500">{admin?.role || 'Administrator'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}