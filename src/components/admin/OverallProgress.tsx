"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar, TrendingUp } from "lucide-react"
import { format } from "date-fns"

interface OverallProgressProps {
  progress: number
  startDate: string | null
  endDate: string | null
  totalTasks?: number
  isLoading?: boolean
}

export default function OverallProgress({ 
  progress, 
  startDate, 
  endDate, 
  totalTasks,
  isLoading = false 
}: OverallProgressProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBD"
    try {
      return format(new Date(dateString), "MMM dd, yyyy")
    } catch {
      return "Invalid Date"
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-green-600"
    if (progress >= 50) return "text-blue-600"
    if (progress >= 25) return "text-orange-600"
    return "text-red-600"
  }

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500"
    if (progress >= 50) return "bg-blue-500"
    if (progress >= 25) return "bg-orange-500"
    return "bg-red-500"
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="space-y-1">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="space-y-1">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Overall Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={`text-2xl font-bold ${getProgressColor(progress)}`}>
              {progress}% Complete
            </span>
            {totalTasks && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>
          <Progress 
            value={progress} 
            className="h-3"
            // @ts-ignore - custom CSS variable for progress color
            style={{ '--progress-background': getProgressBgColor(progress).replace('bg-', '') } as any}
          />
        </div>
        
        {/* Date Information */}
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Start Date
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatDate(startDate)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                End Date
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {formatDate(endDate)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}