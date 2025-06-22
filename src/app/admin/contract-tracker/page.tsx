'use client'

import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function ContractTrackerPage() {
  const router = useRouter()

  const contracts = [
    {
      id: 'CT-001',
      contractorName: 'Zerni Construction',
      projectName: 'Downtown Office Complex',
      status: 'Active',
      startDate: '2024-01-15',
      endDate: '2024-12-31',
      value: '$2,500,000'
    },
    {
      id: 'CT-002',
      contractorName: 'BuildTech Solutions',
      projectName: 'Residential Tower A',
      status: 'Pending',
      startDate: '2024-03-01',
      endDate: '2025-02-28',
      value: '$1,800,000'
    },
    {
      id: 'CT-003',
      contractorName: 'Metro Builders',
      projectName: 'Shopping Center Renovation',
      status: 'Completed',
      startDate: '2023-06-01',
      endDate: '2024-01-15',
      value: '$950,000'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/admin')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Contract Tracker</h1>
              <p className="text-muted-foreground mt-1">Manage and monitor all contractor agreements</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search contracts..." 
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </div>

          <div className="grid gap-4">
            {contracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{contract.contractorName}</CardTitle>
                      <CardDescription className="mt-1">
                        {contract.projectName} • {contract.id}
                      </CardDescription>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Start Date</p>
                      <p>{new Date(contract.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">End Date</p>
                      <p>{new Date(contract.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Contract Value</p>
                      <p className="font-semibold">{contract.value}</p>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}