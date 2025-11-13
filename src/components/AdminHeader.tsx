'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { Menu, Sun, Moon, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { toggleTheme } from '@/lib/features/theme/themeSlice'
import { adminLogout } from '@/lib/features/auth/authSlice'

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
  const { t } = useTranslation('common')
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { admin } = useAppSelector((state) => state.auth)
  const { mode } = useAppSelector((state) => state.theme)
  
  const adminName = admin?.name || 'Admin User'
  const initials = getInitials(adminName)

  const handleLogout = () => {
    dispatch(adminLogout())
    router.push('/admin/login')
  }

  const handleThemeToggle = () => {
    dispatch(toggleTheme())
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Left side - Menu button (mobile) and Title */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Button>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('admin.adminPortal')}</h1>
        </div>

        {/* Right side - Theme Toggle and User Panel */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThemeToggle}
            className="p-2"
          >
            {mode === 'dark' ? (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2">
                {/* Avatar with initials */}
                <div className="h-8 w-8 lg:h-10 lg:w-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs lg:text-sm font-medium text-white">{initials}</span>
                </div>

                {/* User Details */}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{adminName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{admin?.role || 'Administrator'}</p>
                </div>

                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{adminName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{admin?.role || 'Administrator'}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}