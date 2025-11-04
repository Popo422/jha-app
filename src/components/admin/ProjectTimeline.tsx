"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarDays, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Week {
  weekNumber: number
  label: string
  startDate: string
  endDate: string
}

interface TaskTimeline {
  taskId: string
  taskNumber: number
  name: string
  progress: number
  startWeek: number | null
  endWeek: number | null
  duration: number
  timeline: boolean[]
  startDate?: string | null
  endDate?: string | null
}

interface ProjectTimelineProps {
  weeks: Week[]
  taskTimelines: TaskTimeline[]
  isLoading?: boolean
}

export default function ProjectTimeline({ 
  weeks, 
  taskTimelines, 
  isLoading = false 
}: ProjectTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToTask = (task: TaskTimeline) => {
    if (!scrollContainerRef.current || !task.startWeek) return
    
    const containerWidth = scrollContainerRef.current.clientWidth
    const totalWidth = weeks.length * 64 // 4rem = 64px per week
    const taskStartPosition = ((task.startWeek - 1) / weeks.length) * totalWidth
    const taskEndPosition = ((task.endWeek || task.startWeek) / weeks.length) * totalWidth
    const taskCenterPosition = (taskStartPosition + taskEndPosition) / 2
    
    // Scroll to center the task in the viewport
    const scrollPosition = Math.max(0, taskCenterPosition - containerWidth / 2)
    
    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500"
    if (progress >= 75) return "bg-blue-500"
    if (progress >= 50) return "bg-orange-500"
    if (progress >= 25) return "bg-yellow-500"
    return "bg-gray-400"
  }

  const getProgressTextColor = (progress: number) => {
    if (progress >= 100) return "text-green-700"
    if (progress >= 75) return "text-blue-700"
    if (progress >= 50) return "text-orange-700"
    if (progress >= 25) return "text-yellow-700"
    return "text-gray-700"
  }

  const formatTaskName = (name: string, maxLength: number = 20) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header skeleton */}
            <div className="grid grid-cols-10 gap-2 pb-2 border-b">
              <div className="col-span-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="text-center">
                  <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
            
            {/* Task rows skeleton */}
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-10 gap-2 py-2">
                <div className="col-span-2 flex items-center space-y-1">
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
                {Array.from({ length: 8 }).map((_, colIndex) => (
                  <div key={colIndex} className="flex justify-center">
                    <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weeks.length || !taskTimelines.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No timeline data available</p>
            <p className="text-sm">Add tasks with start and end dates to see the project timeline.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show all weeks, make it scrollable
  const displayWeeks = weeks
  const hasMoreWeeks = false

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Project Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Scrollable Timeline Container */}
          <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto max-h-96">
            <div className="min-w-max space-y-4">
              {/* Timeline Header - Sticky */}
              <div className="flex gap-2 pb-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="w-48 flex-shrink-0 font-medium text-sm text-gray-700 dark:text-gray-300">
                  Task
                </div>
                {displayWeeks.map((week) => (
                  <div key={week.weekNumber} className="w-16 flex-shrink-0 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-help">
                            {week.label}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>

              {/* Task Rows */}
              <div className="space-y-2 pb-4">
                {taskTimelines.map((task) => (
                  <div 
                    key={task.taskId} 
                    className="flex gap-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 transition-colors"
                  >
                    {/* Task Info */}
                    <div className="w-48 flex-shrink-0 flex items-center">
                      <div className="flex-1 min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                onClick={() => scrollToTask(task)}
                              >
                                {formatTaskName(task.name, 25)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{task.name}</p>
                                <p className="text-xs text-gray-500">
                                  Task #{task.taskNumber} • {task.duration} days
                                </p>
                                <p className="text-xs text-gray-500">
                                  Progress: {task.progress}%
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {/* Timeline Bar - Continuous */}
                    <div className="flex-1 relative flex items-center py-1" style={{ minWidth: `${displayWeeks.length * 4}rem` }}>
                      {task.startWeek && task.endWeek && (
                        <div 
                          className={cn(
                            "h-4 rounded-full cursor-pointer transition-opacity hover:opacity-80 absolute",
                            getProgressColor(task.progress)
                          )}
                          style={{
                            left: `${((task.startWeek - 1) / displayWeeks.length) * 100}%`,
                            width: `${((task.endWeek - task.startWeek + 1) / displayWeeks.length) * 100}%`
                          }}
                          title={`${task.name}
Progress: ${task.progress}%
Duration: ${task.duration} days
Timeline: Week ${task.startWeek} - Week ${task.endWeek}
Start: ${task.startDate ? new Date(task.startDate).toLocaleDateString() : 'TBD'}
End: ${task.endDate ? new Date(task.endDate).toLocaleDateString() : 'TBD'}`}
                          onClick={() => scrollToTask(task)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-green-500 rounded-sm" />
                <span>Complete (100%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-blue-500 rounded-sm" />
                <span>Nearly Done (75%+)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-orange-500 rounded-sm" />
                <span>In Progress (50%+)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-gray-400 rounded-sm" />
                <span>Not Started (&lt;25%)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}