'use client'

import { useGetCompanyModulesQuery } from '@/lib/features/company/companyApi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useModuleAccess(requiredModule: string) {
  const { data: modulesData, isLoading } = useGetCompanyModulesQuery()
  const router = useRouter()

  const hasAccess = modulesData?.enabledModules?.includes(requiredModule) ?? false

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      // Redirect to contractor forms page with error
      router.push('/contractor-forms')
    }
  }, [isLoading, hasAccess, router])

  return {
    hasAccess,
    isLoading
  }
}