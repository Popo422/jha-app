"use client";

import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import ProjectTasksChoiceModal from "@/components/admin/ProjectTasksChoiceModal";
import { Plus, Upload, Brain, Calendar, Clock, BarChart3 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { 
  useGetProjectTasksQuery, 
  useDeleteProjectTaskMutation,
  type ProjectTask 
} from "@/lib/features/project-tasks/projectTasksApi";
import { useToast } from "@/components/ui/toast";

interface ProjectTasksProps {
  projectId: string;
}

export default function ProjectTasks({ projectId }: ProjectTasksProps) {
  const { t } = useTranslation('common');
  const [searchValue, setSearchValue] = useState("");
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  const { toast, showToast } = useToast();

  // API hooks
  const { data: tasksData, isLoading, isFetching, refetch } = useGetProjectTasksQuery(
    { projectId },
    { skip: !projectId }
  );
  
  const [deleteTask, { isLoading: isDeleting }] = useDeleteProjectTaskMutation();

  const tasks = tasksData?.tasks || [];

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get progress color
  const getProgressColor = (progress: string) => {
    const prog = parseFloat(progress) || 0;
    if (prog >= 100) return "bg-green-100 text-green-800 border-green-200";
    if (prog >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
    if (prog > 0) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Table columns
  const columns = useMemo<ColumnDef<ProjectTask>[]>(() => [
    {
      header: "Task #",
      accessorKey: "taskNumber",
      cell: ({ row }) => (
        <div className="font-medium">#{row.original.taskNumber}</div>
      ),
    },
    {
      header: "Task Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="font-medium max-w-xs truncate" title={row.original.name}>
          {row.original.name}
        </div>
      ),
    },
    {
      header: "Duration",
      accessorKey: "durationDays",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-500" />
          {row.original.durationDays ? `${row.original.durationDays} days` : '-'}
        </div>
      ),
    },
    {
      header: "Start Date",
      accessorKey: "startDate",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-500" />
          {formatDate(row.original.startDate)}
        </div>
      ),
    },
    {
      header: "End Date",
      accessorKey: "endDate",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-500" />
          {formatDate(row.original.endDate)}
        </div>
      ),
    },
    {
      header: "Progress",
      accessorKey: "progress",
      cell: ({ row }) => {
        const progress = parseFloat(row.original.progress) || 0;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getProgressColor(row.original.progress)}>
              <BarChart3 className="h-3 w-3 mr-1" />
              {progress}%
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Predecessors",
      accessorKey: "predecessors",
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 max-w-xs truncate" title={row.original.predecessors || ''}>
          {row.original.predecessors || '-'}
        </div>
      ),
    },
  ], []);


  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteTask({ id, projectId }).unwrap();
      showToast("Task deleted successfully", "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to delete task", "error");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      // Delete all tasks in parallel
      const deletePromises = ids.map(id => 
        deleteTask({ id, projectId }).unwrap()
      );
      
      await Promise.all(deletePromises);
      showToast(`Successfully deleted ${ids.length} task${ids.length > 1 ? 's' : ''}`, "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to delete some tasks", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Project Tasks</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage and track project tasks and schedules
          </p>
        </div>
        <div className="flex gap-2">
          {tasks.length === 0 ? (
            <Button 
              className="flex items-center gap-2"
              onClick={() => setIsChoiceModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Project Tasks
            </Button>
          ) : (
            <Button 
              className="flex items-center gap-2"
              onClick={() => setIsChoiceModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Tasks
            </Button>
          )}
          
          <ProjectTasksChoiceModal
            isOpen={isChoiceModalOpen}
            onOpenChange={setIsChoiceModalOpen}
            projectId={projectId}
          />

        </div>
      </div>

      <AdminDataTable
        data={tasks}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={undefined}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(task) => task.id}
        exportFilename="project-tasks"
        exportHeaders={["Task #", "Task Name", "Duration", "Start Date", "End Date", "Progress", "Predecessors"]}
        getExportData={(task) => [
          task.taskNumber.toString(),
          task.name,
          task.durationDays?.toString() || '',
          formatDate(task.startDate),
          formatDate(task.endDate),
          `${task.progress}%`,
          task.predecessors || ''
        ]}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}