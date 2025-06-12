'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { closeSidebar } from '@/lib/features/sidebar/sidebarSlice'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/AppSidebar'
import { useEffect, useState } from 'react'

interface AppSidebarWrapperProps {
  children: React.ReactNode
}

export default function AppSidebarWrapper({ children }: AppSidebarWrapperProps) {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.sidebar.isOpen)
  const [open, setOpen] = useState(false)

  // Sync Redux state with shadcn sidebar state
  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      dispatch(closeSidebar())
    }
  }

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <div className="flex min-h-screen w-full">
        <main className="flex-1">
          {children}
        </main>
        {isOpen && <AppSidebar />}
      </div>
    </SidebarProvider>
  )
}