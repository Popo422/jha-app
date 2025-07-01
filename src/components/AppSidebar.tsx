'use client'

import { Bell, ClipboardList, Clock, HardHat, FolderOpen, LogOut, Moon, Sun } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { closeSidebar } from '@/lib/features/sidebar/sidebarSlice'
import { logout } from '@/lib/features/auth/authSlice'
import { toggleTheme } from '@/lib/features/theme/themeSlice'
import { useGetCompanyModulesQuery } from '@/lib/features/company/companyApi'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { useMemo } from 'react'

const allNavigation = [
  { name: 'Announcements', href: '/announcements', icon: Bell, moduleId: null }, // Always shown
  { name: 'Contractor Forms', href: '/contractor-forms', icon: ClipboardList, moduleId: 'forms' }, // Show if any form modules are enabled
  { name: 'Time Sheet', href: '/timesheet', icon: Clock, moduleId: 'timesheet' },
  { name: 'Toolbox Talks', href: '/toolbox-talks', icon: HardHat, moduleId: null }, // Always shown
  { name: 'My Submissions', href: '/my-submissions', icon: FolderOpen, moduleId: null }, // Always shown
]

export default function AppSidebar() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.sidebar.isOpen)
  const theme = useAppSelector((state) => state.theme.mode)
  const { data: modulesData } = useGetCompanyModulesQuery()

  const navigation = useMemo(() => {
    if (!modulesData?.enabledModules) return allNavigation;
    
    return allNavigation.filter(item => {
      if (item.moduleId === null) return true; // Always show items without module requirements
      if (item.moduleId === 'forms') {
        // Show contractor forms if any form modules are enabled
        return modulesData.enabledModules.some(module => 
          ['start-of-day', 'end-of-day', 'job-hazard-analysis'].includes(module)
        );
      }
      return modulesData.enabledModules.includes(item.moduleId);
    });
  }, [modulesData])

  const handleLinkClick = () => {
    dispatch(closeSidebar())
  }

  const handleLogout = () => {
    dispatch(logout())
    dispatch(closeSidebar())
  }

  return (
    <Sheet open={isOpen} onOpenChange={() => dispatch(closeSidebar())}>
      <SheetContent side="right" className="w-80 bg-[#242736] dark:bg-background border-slate-700 dark:border-border text-white dark:text-foreground">
        <SheetHeader className="hidden">
          <SheetTitle className="text-white dark:text-foreground">Navigation</SheetTitle>
          <SheetDescription className="text-gray-300 dark:text-muted-foreground">
            Navigate through the application
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="w-full justify-start text-white hover:text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted"
                  asChild
                >
                  <Link href={item.href} onClick={handleLinkClick}>
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                </Button>
              )
            })}
          </nav>

          <Separator className="my-6 bg-slate-600 dark:bg-border" />
          
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted"
            onClick={() => dispatch(toggleTheme())}
          >
            {theme === 'light' ? <Moon className="h-4 w-4 mr-3" /> : <Sun className="h-4 w-4 mr-3" />}
            Toggle Theme
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 dark:text-destructive dark:hover:text-destructive dark:hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to login again to access the application.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator className="my-6 bg-slate-600 dark:bg-border" />

        <div className="text-sm text-gray-400 dark:text-muted-foreground">
          JHA App v1.0
        </div>
      </SheetContent>
    </Sheet>
  )
}