'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { 
  FileText, 
  ClipboardCheck, 
  Clock, 
  Users, 
  MessageSquare, 
  BarChart3, 
  LogOut, 
  Settings, 
  HelpCircle,
  X
} from 'lucide-react'

interface SidebarItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  action?: () => void
}

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    // Clear admin auth cookie
    document.cookie = 'adminAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/admin/login')
  }

  const mainItems: SidebarItem[] = [
    {
      label: 'Contractor Tracker',
      href: '/admin/contractor-tracker',
      icon: FileText
    },
    {
      label: 'Review Safety Forms',
      href: '/admin/safety-forms',
      icon: ClipboardCheck
    },
    {
      label: 'Review Time Forms',
      href: '/admin/time-forms',
      icon: Clock
    },
    {
      label: 'Contractors Editor',
      href: '/admin/contractors',
      icon: Users
    },
    // {
    //   label: 'Employee Editor',
    //   href: '/admin/employees',
    //   icon: Users
    // },
    {
      label: 'Toolbox Talks',
      href: '/admin/toolbox-talks',
      icon: MessageSquare
    },
    {
      label: 'Reporting',
      href: '/admin/reporting',
      icon: BarChart3
    }
  ]

  const bottomItems: SidebarItem[] = [
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings
    },
    {
      label: 'Help & Support',
      href: '/admin/help',
      icon: HelpCircle
    }
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-[#242736] h-full flex flex-col text-white transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        "fixed left-0 top-0 z-50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header with close button */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <Image 
              src="/logo.png" 
              alt="JHA App" 
              width={140} 
              height={30} 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                router.push('/admin')
                onClose()
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:text-white hover:bg-white/10 p-1"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {mainItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "w-full justify-start h-11 px-4 text-left font-normal text-white hover:text-white hover:bg-white/10",
                isActive 
                  ? "bg-blue-600 text-white hover:bg-blue-600" 
                  : ""
              )}
              onClick={() => {
                router.push(item.href)
                onClose()
              }}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 space-y-2">
        <Separator className="bg-slate-600 mb-4" />
        
        {/* Settings and Help - smaller */}
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start h-9 px-4 text-left font-normal text-gray-300 hover:text-white hover:bg-white/10 text-sm",
                isActive 
                  ? "bg-blue-600 text-white hover:bg-blue-600" 
                  : ""
              )}
              onClick={() => {
                router.push(item.href)
                onClose()
              }}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          )
        })}

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-9 px-4 text-left font-normal text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
        </div>
      </div>
    </>
  )
}