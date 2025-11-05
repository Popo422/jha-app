"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import ProjectTasksChoiceModal from "@/components/admin/ProjectTasksChoiceModal";
import { Plus, Upload, Brain, Calendar, Clock, BarChart3, Check, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { 
  useGetProjectTasksQuery, 
  useDeleteProjectTaskMutation,
  useUpdateProjectTaskMutation,
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
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    durationDays: '',
    startDate: '',
    endDate: '',
    progress: '',
    cost: '',
    predecessors: '',
    completed: false
  });

  const { toast, showToast } = useToast();

  // API hooks
  const { data: tasksData, isLoading, isFetching, refetch } = useGetProjectTasksQuery(
    { projectId },
    { skip: !projectId }
  );
  
  const [deleteTask, { isLoading: isDeleting }] = useDeleteProjectTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateProjectTaskMutation();

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
        const isCompleted = row.original.completed;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getProgressColor(row.original.progress)}>
              <BarChart3 className="h-3 w-3 mr-1" />
              {isCompleted ? '100' : progress}%
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Cost",
      accessorKey: "cost",
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.cost ? `$${parseFloat(row.original.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </div>
      ),
    },
    {
      header: "Completed",
      accessorKey: "completed",
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.completed ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <X className="h-5 w-5 text-gray-400" />
          )}
        </div>
      ),
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

  // Handle edit
  const handleEdit = (task: ProjectTask) => {
    setEditingTask(task);
    setEditForm({
      name: task.name,
      durationDays: task.durationDays?.toString() || '',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      progress: task.progress || '0',
      cost: task.cost || '',
      predecessors: task.predecessors || '',
      completed: task.completed || false
    });
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editingTask) return;

    try {
      // If marked as completed, set progress to 100
      const finalProgress = editForm.completed ? 100 : (parseFloat(editForm.progress) || 0);
      
      await updateTask({
        id: editingTask.id,
        name: editForm.name,
        durationDays: editForm.durationDays ? parseInt(editForm.durationDays) : undefined,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        progress: finalProgress,
        cost: editForm.cost ? parseFloat(editForm.cost) : undefined,
        completed: editForm.completed,
        predecessors: editForm.predecessors || undefined
      }).unwrap();
      
      showToast("Task updated successfully", "success");
      setEditingTask(null);
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to update task", "error");
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingTask(null);
    setEditForm({
      name: '',
      durationDays: '',
      startDate: '',
      endDate: '',
      progress: '',
      cost: '',
      predecessors: '',
      completed: false
    });
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(task) => task.id}
        exportFilename="project-tasks"
        exportHeaders={["Task #", "Task Name", "Duration", "Start Date", "End Date", "Progress", "Completed", "Predecessors"]}
        getExportData={(task) => [
          task.taskNumber.toString(),
          task.name,
          task.durationDays?.toString() || '',
          formatDate(task.startDate),
          formatDate(task.endDate),
          `${task.completed ? '100' : task.progress}%`,
          task.completed ? 'Yes' : 'No',
          task.predecessors || ''
        ]}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && handleEditCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task #{editingTask?.taskNumber}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Task Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-duration">Duration (days)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={editForm.durationDays}
                  onChange={(e) => setEditForm({ ...editForm, durationDays: e.target.value })}
                  placeholder="Duration"
                />
              </div>
              <div>
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.progress}
                  onChange={(e) => setEditForm({ ...editForm, progress: e.target.value })}
                  placeholder="Progress"
                  disabled={editForm.completed}
                />
                {editForm.completed && (
                  <p className="text-xs text-gray-500 mt-1">Progress is automatically set to 100% when marked as completed</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-cost">Cost (Optional)</Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                min="0"
                value={editForm.cost}
                onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                placeholder="Enter task cost"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-end">End Date</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-predecessors">Predecessors</Label>
              <Input
                id="edit-predecessors"
                value={editForm.predecessors}
                onChange={(e) => setEditForm({ ...editForm, predecessors: e.target.value })}
                placeholder="e.g., 1,2 or 3FS+5 days"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-completed"
                checked={editForm.completed}
                onCheckedChange={(checked) => setEditForm({ 
                  ...editForm, 
                  completed: !!checked,
                  // If marking as completed, set progress to 100, otherwise keep current value
                  progress: checked ? '100' : editForm.progress
                })}
              />
              <Label htmlFor="edit-completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Mark as Completed
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isUpdating || !editForm.name.trim()}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}