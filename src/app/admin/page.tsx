'use client'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useAdminStats } from '@/hooks/useAdminStats'
import InjuryTimer from '@/components/InjuryTimer'
import { 
  FileText, 
  ClipboardCheck, 
  Clock, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react'

export default function AdminPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { stats, isLoading, error } = useAdminStats()

  const translateActivityAction = (action: string) => {
    if (action === 'Timesheet submitted') {
      return t('status.timesheetSubmitted')
    }
    // Handle form submissions like "end-of-day form submitted"
    if (action.includes('form submitted')) {
      const formType = action.replace(' form submitted', '')
      return `${formType} ${t('status.formSubmitted')}`
    }
    return action
  }

  const translateTimeAgo = (timeStr: string) => {
    if (timeStr === 'Just now') {
      return t('status.justNow')
    }
    
    // Handle "X hour(s) ago"
    const hourMatch = timeStr.match(/^(\d+) hours? ago$/)
    if (hourMatch) {
      const hours = parseInt(hourMatch[1])
      return `${hours} ${hours === 1 ? t('status.hourAgo') : t('status.hoursAgo')}`
    }
    
    // Handle "X day(s) ago"  
    const dayMatch = timeStr.match(/^(\d+) days? ago$/)
    if (dayMatch) {
      const days = parseInt(dayMatch[1])
      return `${days} ${days === 1 ? t('status.dayAgo') : t('status.daysAgo')}`
    }
    
    return timeStr
  }

  const getQuickStats = () => {
    if (!stats) return []
    
    return [
      {
        title: t('status.activeContractors'),
        value: stats.activeContractors.total.toString(),
        change: `+${stats.activeContractors.thisWeek} ${t('status.thisWeek')}`,
        icon: Users,
        color: 'bg-blue-500'
      },
      {
        title: t('status.safetyFormsThisWeek'),
        value: stats.submissions.thisWeek.toString(),
        change: `${stats.submissions.today} ${t('status.today')}`,
        icon: AlertTriangle,
        color: 'bg-orange-500'
      },
      {
        title: t('status.timesheetsThisWeek'),
        value: stats.timesheets.thisWeek.toString(),
        change: `${stats.timesheets.today} ${t('status.today')}`,
        icon: Clock,
        color: 'bg-green-500'
      },
      {
        title: t('status.complianceRate'),
        value: `${stats.complianceRate}%`,
        change: t('status.basedOnSubmissions'),
        icon: CheckCircle,
        color: 'bg-purple-500'
      }
    ]
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-destructive">{t('status.errorLoadingDashboard')} {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('pages.welcomeBack')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('pages.dashboardDescription')}</p>
        </div>

        {/* Injury Timer Section */}
        <div className="mb-8">
          <InjuryTimer showResetButton={true} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            getQuickStats().map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.change}</p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                {t('status.recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  // Loading skeletons for recent activity
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))
                ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{translateActivityAction(activity.action)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activity.contractor}</p>
                      </div>
                      <p className="text-xs text-gray-400">{translateTimeAgo(activity.time)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('status.noRecentActivity')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                {t('status.actionRequired')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  // Loading skeletons for action items
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))
                ) : stats?.actionRequired ? (
                  <>
                    {stats.actionRequired.urgentSafetyForms > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-red-900">
                            {stats.actionRequired.urgentSafetyForms} urgent safety form{stats.actionRequired.urgentSafetyForms !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-red-600">{t('status.requiresImmediateAttention')}</p>
                        </div>
                        <button 
                          onClick={() => router.push('/admin/safety-forms')}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          {t('common.review')} →
                        </button>
                      </div>
                    )}
                    {stats.actionRequired.recentSafetyForms > 0 && (
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-yellow-900">
                            {stats.actionRequired.recentSafetyForms} recent safety form{stats.actionRequired.recentSafetyForms !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-yellow-600">{t('status.fromLastThreeDays')}</p>
                        </div>
                        <button 
                          onClick={() => router.push('/admin/safety-forms')}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                        >
                          {t('common.review')} →
                        </button>
                      </div>
                    )}
                    {stats.actionRequired.pendingTimesheets > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {stats.actionRequired.pendingTimesheets} pending timesheet{stats.actionRequired.pendingTimesheets !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-blue-600">Awaiting approval</p>
                        </div>
                        <button 
                          onClick={() => router.push('/admin/time-forms')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Review →
                        </button>
                      </div>
                    )}
                    {stats.actionRequired.urgentSafetyForms === 0 && 
                     stats.actionRequired.recentSafetyForms === 0 && 
                     stats.actionRequired.pendingTimesheets === 0 && (
                      <div className="text-center py-4">
                        <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">All caught up! No actions required.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('status.unableToLoadActionItems')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}