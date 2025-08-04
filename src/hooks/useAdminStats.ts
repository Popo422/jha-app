import { useState, useEffect } from 'react'

interface AdminStats {
  activeContractors: {
    total: number
    thisWeek: number
  }
  submissions: {
    thisWeek: number
    today: number
  }
  timesheets: {
    thisWeek: number
    today: number
  }
  complianceRate: number
  recentActivity: Array<{
    action: string
    contractor: string
    time: string
  }>
  actionRequired: {
    urgentSafetyForms: number
    pendingTimesheets: number
    recentSafetyForms: number
  }
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/stats')
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          const errorData = await response.json()
          setError(errorData.message || 'Failed to fetch stats')
        }
      } catch (err) {
        setError('An error occurred while fetching stats')
        console.error('Error fetching admin stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, isLoading, error, refetch: () => setIsLoading(true) }
}