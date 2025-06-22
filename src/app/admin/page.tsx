'use client'

import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Settings, Users, FileText, BarChart3 } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()

  const handleLogout = () => {
    // Clear admin auth cookie
    document.cookie = 'adminAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/admin/login')
  }

  const adminSections = [
    {
      title: 'Contract Tracker',
      description: 'Manage and track all contractor agreements',
      icon: FileText,
      href: '/admin/contract-tracker',
      color: 'bg-blue-500'
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'bg-green-500'
    },
    {
      title: 'Reports & Analytics',
      description: 'View system reports and analytics',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'bg-purple-500'
    },
    {
      title: 'System Settings',
      description: 'Configure system settings and preferences',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-orange-500'
    }
  ]

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">Manage your system and contractors</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {adminSections.map((section) => {
              const IconComponent = section.icon
              return (
                <Card 
                  key={section.href}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(section.href)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${section.color} text-white`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-start">
                      Access {section.title} →
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}