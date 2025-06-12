'use client'

import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'

export default function TimesheetPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Time Sheet</h1>
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <p className="text-muted-foreground">
              Time sheet functionality coming soon. Track your hours and submit time entries here.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}