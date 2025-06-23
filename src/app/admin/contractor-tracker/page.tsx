'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contractor Tracker</h1>
        <p className="text-gray-600 mt-1">Manage and monitor all contractor agreements</p>
      </div>
    </div>
  )
}