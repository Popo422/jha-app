'use client'

import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'

export default function MySubmissionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">My Submissions</h1>
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <p className="text-muted-foreground">
              View and manage your submitted forms and documents here. No submissions found at this time.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}