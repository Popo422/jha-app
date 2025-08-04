'use client'

import { useTranslation } from 'react-i18next'
import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'
import SafetyFormChecklist from '@/components/SafetyFormChecklist'
import InjuryTimer from '@/components/InjuryTimer'

export default function AnnouncementsPage() {
  const { t } = useTranslation('common')
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">{t('nav.announcements')}</h1>
          
          <div className="space-y-4 md:space-y-6">
            <SafetyFormChecklist />
            
            <InjuryTimer />
            
            <div className="bg-card text-card-foreground rounded-lg border p-4 md:p-6">
              <p className="text-muted-foreground text-sm md:text-base">
                {t('pages.noAnnouncements')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}