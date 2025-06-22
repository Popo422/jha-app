'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  const quickStats = [
    {
      title: 'Active Contractors',
      value: '24',
      change: '+2 this week',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Safety Forms',
      value: '7',
      change: '3 urgent',
      icon: AlertTriangle,
      color: 'bg-orange-500'
    },
    {
      title: 'Time Forms Submitted',
      value: '156',
      change: '+12 today',
      icon: Clock,
      color: 'bg-green-500'
    },
    {
      title: 'Compliance Rate',
      value: '94%',
      change: '+2% this month',
      icon: CheckCircle,
      color: 'bg-purple-500'
    }
  ]

  const recentActivity = [
    { action: 'New contractor registration', contractor: 'ABC Construction', time: '2 hours ago' },
    { action: 'Safety form submitted', contractor: 'BuildTech Solutions', time: '4 hours ago' },
    { action: 'Time sheet approved', contractor: 'Metro Builders', time: '6 hours ago' },
    { action: 'Contract updated', contractor: 'Zerni Construction', time: '1 day ago' },
  ]

  return (
    <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">{`Here's what's happening with your contractors today.`}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.contractor}</p>
                    </div>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-900">3 urgent safety forms</p>
                    <p className="text-xs text-red-600">Requires immediate attention</p>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/safety-forms')}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Review →
                  </button>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">2 pending contracts</p>
                    <p className="text-xs text-yellow-600">Awaiting approval</p>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/contractor-tracker')}
                    className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                  >
                    Review →
                  </button>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-900">5 time forms to approve</p>
                    <p className="text-xs text-blue-600">{`This week's submissions`}</p>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/time-forms')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Review →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}