'use client'

import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'

export default function ToolboxTalksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Toolbox Talks</h1>
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <p className="text-muted-foreground">
              Safety toolbox talks and training materials will be available here. Stay tuned for important safety updates.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}