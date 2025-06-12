'use client'

import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
        <Header />
        <AppSidebar />
        <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to JHA App
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              A modern Next.js application with Redux, TypeScript, shadcn/ui, and Drizzle ORM
            </p>
            
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button asChild>
                <Link href="/login">Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Redux State Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Global state management with Redux Toolkit for themes, sidebar, and authentication.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>shadcn/ui Components</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Beautiful, accessible components built with Radix UI and Tailwind CSS.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PostgreSQL + Drizzle</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Modern ORM with PostgreSQL for efficient database operations and type safety.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}