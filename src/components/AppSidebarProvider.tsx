'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { openSidebar, closeSidebar } from '@/lib/features/sidebar/sidebarSlice'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import AppSidebar from '@/components/AppSidebar'

interface AppSidebarProviderProps {
  children: React.ReactNode
}

export default function AppSidebarProvider({ children }: AppSidebarProviderProps) {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.sidebar.isOpen)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      dispatch(openSidebar())
    } else {
      dispatch(closeSidebar())
    }
  }

  return (
    <SidebarProvider open={isOpen} onOpenChange={handleOpenChange}>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}