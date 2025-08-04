'use client'

import { X, Home, Settings, Users, BarChart, Calendar, FileText } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { closeSidebar } from '@/lib/features/sidebar/sidebarSlice'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.sidebar.isOpen)

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={() => dispatch(closeSidebar())}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-64 bg-background shadow-lg transform transition-transform duration-300 ease-in-out border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Navigation
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(closeSidebar())}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-4 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link
                      href={item.href}
                      onClick={() => dispatch(closeSidebar())}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}