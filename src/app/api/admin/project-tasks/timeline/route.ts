import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projectTasks, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { validateAdminSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const validation = await validateAdminSession(request)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project belongs to the admin's company
    const project = await db
      .select({
        id: projects.id,
        name: projects.name,
        companyId: projects.companyId,
        createdAt: projects.createdAt
      })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.companyId, validation.company?.id || '')
      ))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all project tasks with timeline data
    const tasks = await db
      .select({
        id: projectTasks.id,
        taskNumber: projectTasks.taskNumber,
        name: projectTasks.name,
        durationDays: projectTasks.durationDays,
        startDate: projectTasks.startDate,
        endDate: projectTasks.endDate,
        progress: projectTasks.progress,
        predecessors: projectTasks.predecessors,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt
      })
      .from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(projectTasks.taskNumber)

    // Calculate overall project progress
    const totalTasks = tasks.length
    const totalProgress = tasks.reduce((sum, task) => sum + (Number(task.progress) || 0), 0)
    const overallProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0

    // Calculate project timeline bounds
    const taskStartDates = tasks
      .map(task => task.startDate)
      .filter(date => date !== null)
      .sort()
    
    const taskEndDates = tasks
      .map(task => task.endDate)
      .filter(date => date !== null)
      .sort()

    const projectStartDate = taskStartDates.length > 0 ? taskStartDates[0] : null
    const projectEndDate = taskEndDates.length > 0 ? taskEndDates[taskEndDates.length - 1] : null

    // Generate week-based timeline data
    const timelineData = generateWeeklyTimeline(tasks, projectStartDate, projectEndDate)

    return NextResponse.json({
      project: project[0],
      overallProgress,
      projectStartDate,
      projectEndDate,
      totalTasks,
      tasks,
      timelineData
    })

  } catch (error) {
    console.error('Error fetching project timeline:', error)
    return NextResponse.json({ error: 'Failed to fetch project timeline' }, { status: 500 })
  }
}

function generateWeeklyTimeline(tasks: any[], projectStartDate: string | null, projectEndDate: string | null) {
  if (!projectStartDate || !projectEndDate) {
    return { weeks: [], taskTimelines: [] }
  }

  const start = new Date(projectStartDate)
  const end = new Date(projectEndDate)
  
  // Calculate total weeks
  const totalWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  
  // Generate week headers
  const weeks = Array.from({ length: totalWeeks }, (_, index) => {
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + (index * 7))
    return {
      weekNumber: index + 1,
      label: `W${index + 1}`,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    }
  })

  // Generate task timelines
  const taskTimelines = tasks.map(task => {
    if (!task.startDate || !task.endDate) {
      return {
        taskId: task.id,
        taskNumber: task.taskNumber,
        name: task.name,
        progress: Number(task.progress) || 0,
        startWeek: null,
        endWeek: null,
        duration: 0,
        timeline: Array(totalWeeks).fill(false)
      }
    }

    const taskStart = new Date(task.startDate)
    const taskEnd = new Date(task.endDate)
    
    // Calculate which weeks this task spans
    const startWeek = Math.floor((taskStart.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const endWeek = Math.floor((taskEnd.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    // Create timeline array showing which weeks are active
    const timeline = Array(totalWeeks).fill(false)
    for (let i = Math.max(0, startWeek); i <= Math.min(totalWeeks - 1, endWeek); i++) {
      timeline[i] = true
    }

    return {
      taskId: task.id,
      taskNumber: task.taskNumber,
      name: task.name,
      progress: Number(task.progress) || 0,
      startWeek: Math.max(0, startWeek) + 1,
      endWeek: Math.min(totalWeeks - 1, endWeek) + 1,
      duration: task.durationDays || 0,
      timeline,
      startDate: task.startDate,
      endDate: task.endDate
    }
  })

  return { weeks, taskTimelines }
}