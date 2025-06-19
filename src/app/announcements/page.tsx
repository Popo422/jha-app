'use client'

import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'
import SafetyFormChecklist from '@/components/SafetyFormChecklist'

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Announcements</h1>
          
          <div className="space-y-6">
            <SafetyFormChecklist />
            
            <div className="bg-card text-card-foreground rounded-lg border p-6">
              <p className="text-muted-foreground">
                No announcements at this time. Check back later for important updates and notifications.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}