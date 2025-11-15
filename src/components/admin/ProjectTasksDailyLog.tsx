"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetProjectTasksQuery, type ProjectTask } from "@/lib/features/project-tasks/projectTasksApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpDown, AlertTriangle, Clock, Calendar, CheckCircle, TrendingUp } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface ProjectTasksDailyLogProps {
  projectId: string;
}

type TaskStatus = 'overdue' | 'in-progress' | 'upcoming' | 'completed';

const getTaskStatus = (task: ProjectTask): TaskStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const progress = parseFloat(task.progress) || 0;
  
  // If progress is 100%, task is completed
  if (progress >= 100 || task.completed) {
    return 'completed';
  }
  
  // If task has an end date
  if (task.endDate) {
    const endDate = new Date(task.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    // Overdue: past end date and not completed
    if (endDate < today) {
      return 'overdue';
    }
    
    // Current week check (7 days from today)
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    // In progress: within current week or already started
    if (task.startDate) {
      const startDate = new Date(task.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate <= today && endDate >= today) {
        return 'in-progress';
      }
    }
    
    // Upcoming: starts within next week
    if (endDate <= nextWeek) {
      return 'upcoming';
    }
  }
  
  // Default: if no dates or future task
  return 'upcoming';
};

const getStatusDisplay = (status: TaskStatus) => {
  switch (status) {
    case 'overdue':
      return {
        label: 'Overdue',
        icon: AlertTriangle,
        color: 'bg-red-100 text-red-800',
        iconColor: 'text-red-600'
      };
    case 'in-progress':
      return {
        label: 'In Progress',
        icon: TrendingUp,
        color: 'bg-blue-100 text-blue-800',
        iconColor: 'text-blue-600'
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        icon: Calendar,
        color: 'bg-orange-100 text-orange-800',
        iconColor: 'text-orange-600'
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800',
        iconColor: 'text-green-600'
      };
  }
};

export default function ProjectTasksDailyLog({ projectId }: ProjectTasksDailyLogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: tasksData, isLoading, isFetching } = useGetProjectTasksQuery({
    projectId,
  });

  const allTasks = tasksData?.tasks || [];

  // Filter and order tasks to show only relevant ones for daily log
  const filteredTasks = useMemo(() => {
    let filtered = allTasks.filter(task => {
      const status = getTaskStatus(task);
      // Show overdue, in-progress, and upcoming tasks (exclude completed unless recently completed)
      return status === 'overdue' || status === 'in-progress' || status === 'upcoming';
    });

    // Apply search filter if search term exists
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchLower) ||
        task.taskNumber.toString().includes(searchLower) ||
        (task.predecessors && task.predecessors.toLowerCase().includes(searchLower))
      );
    }

    // Sort by priority: overdue first, then in-progress, then upcoming
    // Within each status group, sort by task number
    filtered.sort((a, b) => {
      const statusA = getTaskStatus(a);
      const statusB = getTaskStatus(b);
      
      // Define priority order for statuses
      const statusPriority = { 'overdue': 1, 'in-progress': 2, 'upcoming': 3, 'completed': 4 };
      
      const priorityA = statusPriority[statusA];
      const priorityB = statusPriority[statusB];
      
      // First sort by status priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same status, sort by task number
      return a.taskNumber - b.taskNumber;
    });

    return filtered;
  }, [allTasks, debouncedSearch]);

  const handleAdd = () => {
    // Navigate to the project dashboard tasks tab
    router.push(`/admin/project-dashboard/${projectId}?tab=tasks`);
  };

  // No edit or delete functionality - just view and redirect to tasks
  const handleEdit = (task: ProjectTask) => {
    // Navigate to project dashboard tasks tab
    router.push(`/admin/project-dashboard/${projectId}?tab=tasks`);
  };

  const columns: ColumnDef<ProjectTask>[] = [
    {
      accessorKey: "taskNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Task #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const taskNumber = row.getValue("taskNumber") as number;
        return <span className="font-medium">#{taskNumber}</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const task = row.original;
        const status = getTaskStatus(task);
        const statusDisplay = getStatusDisplay(status);
        const Icon = statusDisplay.icon;
        
        return (
          <div className="flex items-center space-x-2">
            <Icon className={`h-4 w-4 ${statusDisplay.iconColor}`} />
            <span className={`text-xs px-2 py-1 rounded-full ${statusDisplay.color}`}>
              {statusDisplay.label}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Task Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name}</span>;
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => {
        const date = row.getValue("startDate") as string | null;
        return date ? new Date(date).toLocaleDateString() : "—";
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => {
        const date = row.getValue("endDate") as string | null;
        return date ? new Date(date).toLocaleDateString() : "—";
      },
    },
    {
      accessorKey: "durationDays",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("durationDays") as number | null;
        return duration ? `${duration} days` : "—";
      },
    },
    {
      accessorKey: "progress",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Progress
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const progress = parseFloat(row.getValue("progress") as string) || 0;
        return (
          <div className="flex items-center space-x-2">
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progress >= 100 ? 'bg-green-500' : 
                  progress >= 75 ? 'bg-blue-500' : 
                  progress >= 50 ? 'bg-orange-500' : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "predecessors",
      header: "Prerequisites",
      cell: ({ row }) => {
        const predecessors = row.getValue("predecessors") as string | null;
        return predecessors ? (
          <span className="text-sm">{predecessors}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Daily Task Log</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track overdue, in-progress, and upcoming tasks for today's planning
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleAdd} 
              className="flex items-center space-x-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Manage Tasks</span>
            </Button>
          </div>
        </div>
      </div>

      <AdminDataTable
        data={filteredTasks}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        getRowId={(task) => task.id}
        exportFilename="daily-task-log"
        exportHeaders={[
          'Task #', 
          'Status', 
          'Task Name', 
          'Start Date', 
          'End Date', 
          'Duration', 
          'Progress (%)', 
          'Prerequisites'
        ]}
        getExportData={(task) => {
          const status = getTaskStatus(task);
          const statusDisplay = getStatusDisplay(status);
          return [
            `#${task.taskNumber}`,
            statusDisplay.label,
            task.name,
            task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
            task.endDate ? new Date(task.endDate).toLocaleDateString() : '',
            task.durationDays ? `${task.durationDays} days` : '',
            task.progress + '%',
            task.predecessors || '',
          ];
        }}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}