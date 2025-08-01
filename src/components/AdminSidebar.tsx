'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/lib/hooks'
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
  X,
  Puzzle,
  Shield,
  Home,
  Camera,
  Sparkles,
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
  const { t } = useTranslation('common')
  const router = useRouter()
  const pathname = usePathname()
  const { admin } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    // Clear admin auth cookie
    document.cookie = 'adminAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/admin/login')
  }

  const mainItems: SidebarItem[] = [
    {
      label: t('admin.dashboard'),
      href: '/admin',
      icon: Home
    },
    {
      label: t('admin.onboarding'),
      href: '/admin/onboarding',
      icon: Sparkles
    },
    {
      label: t('admin.submissionTracker'),
      href: '/admin/contractor-tracker',
      icon: FileText
    },
    {
      label: t('admin.reviewSafetyForms'),
      href: '/admin/safety-forms',
      icon: ClipboardCheck
    },
    {
      label: t('admin.reviewTimeForms'),
      href: '/admin/time-forms',
      icon: Clock
    },
    {
      label: t('admin.contractorsEditor'),
      href: '/admin/contractors',
      icon: Users
    },
    {
      label: t('admin.moduleConfiguration'),
      href: '/admin/modules',
      icon: Puzzle
    },
    {
      label: t('admin.adminEditor'),
      href: '/admin/admin-editor',
      icon: Shield
    },
    {
      label: t('admin.toolboxTalks'),
      href: '/admin/toolbox-talks',
      icon: MessageSquare
    },
    {
      label: t('admin.reporting'),
      href: '/admin/reporting',
      icon: BarChart3
    },
    {
      label: t('admin.projectSnapshot'),
      href: '/admin/project-snapshot',
      icon: Camera
    }
  ]

  const bottomItems: SidebarItem[] = [
    {
      label: t('admin.settings'),
      href: '/admin/settings',
      icon: Settings
    },
    {
      label: t('admin.helpSupport'),
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
            <img 
              src={admin?.companyLogoUrl || "/logo.png"} 
              alt={admin?.companyName || "JHA App"} 
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
                "w-full justify-start h-11 px-4 text-left font-normal text-white hover:text-white hover:bg-white/10 text-wrap",
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
          {t('auth.logout')}
        </Button>
        </div>
      </div>
    </>
  )
}