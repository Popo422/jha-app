'use client'

import { Bell, ClipboardList, Clock, HardHat, FolderOpen, LogOut, Moon, Sun, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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


export default function AppSidebar() {
  const { t } = useTranslation('common')
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.sidebar.isOpen)
  const theme = useAppSelector((state) => state.theme.mode)
  
  const allNavigation = [
    { name: t('nav.announcements'), href: '/announcements', icon: Bell, moduleId: null },
    { name: t('nav.contractorForms'), href: '/contractor-forms', icon: ClipboardList, moduleId: 'forms' },
    { name: t('nav.timesheet'), href: '/timesheet', icon: Clock, moduleId: 'timesheet' },
    { name: t('nav.toolboxTalks'), href: '/toolbox-talks', icon: HardHat, moduleId: null },
    { name: t('nav.submissions'), href: '/my-submissions', icon: FolderOpen, moduleId: null },
    { name: t('settings.title'), href: '/settings', icon: Settings, moduleId: null },
  ]
  const { data: modulesData, isLoading: modulesLoading } = useGetCompanyModulesQuery(undefined, {
    // Only refetch when user navigates away and back after 5 minutes
    refetchOnMountOrArgChange: 300,
    // Don't refetch on window focus
    refetchOnFocus: false,
    // Don't refetch on reconnect
    refetchOnReconnect: false,
  })

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
                  className="w-full justify-start text-white hover:text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted text-wrap"
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
            {t('nav.toggleTheme')}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 dark:text-destructive dark:hover:text-destructive dark:hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-3" />
                {t('auth.logout')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('auth.logoutConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('auth.logoutDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>{t('auth.logout')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator className="my-6 bg-slate-600 dark:bg-border" />

        <div className="text-sm text-gray-400 dark:text-muted-foreground">
          {t('nav.version')}
        </div>
      </SheetContent>
    </Sheet>
  )
}