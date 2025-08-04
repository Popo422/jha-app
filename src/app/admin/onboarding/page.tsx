'use client'

import { useTranslation } from 'react-i18next'
import AdminOnboarding from '@/components/admin/AdminOnboarding'

export default function AdminOnboardingPage() {
  const { t } = useTranslation('common')

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('admin.onboarding')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('admin.onboardingDescription')}
        </p>
      </div>
      
      <AdminOnboarding />
    </div>
  )
}