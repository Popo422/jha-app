"use client";

import React, { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetDailyLogsQuery, useDeleteDailyLogMutation, useCreateDailyLogMutation, useUpdateDailyLogMutation, type DailyLog } from "@/lib/features/daily-logs/dailyLogsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DailyLogsBulkUploadModal } from "@/components/admin/DailyLogsBulkUploadModal";
import { Plus, ArrowUpDown, Save, X, Upload, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface ProjectDailyLogsProps {
  projectId: string;
}

export default function ProjectDailyLogs({ projectId }: ProjectDailyLogsProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<DailyLog | null>(null);
  const [formData, setFormData] = useState({
    taskName: "",
    startDate: "",
    endDate: "",
    predecessor: "",
    progress: 0,
    logDate: new Date().toISOString().split('T')[0], // Today's date
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const { showToast } = useToast();
  
  const { data: dailyLogsData, isLoading, isFetching } = useGetDailyLogsQuery({
    projectId,
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 100,
  });
  
  const [deleteLog, { isLoading: isDeleting }] = useDeleteDailyLogMutation();
  const [createLog, { isLoading: isCreating, error: createError }] = useCreateDailyLogMutation();
  const [updateLog, { isLoading: isUpdating, error: updateError }] = useUpdateDailyLogMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const allLogs = dailyLogsData?.logs || [];

  const handleEdit = (log: DailyLog) => {
    setEditingLog(log);
    setFormData({
      taskName: log.taskName,
      startDate: log.startDate || "",
      endDate: log.endDate || "",
      predecessor: log.predecessor || "",
      progress: parseFloat(log.progress) || 0,
      logDate: log.logDate,
      notes: log.notes || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingLog(null);
    setFormData({
      taskName: "",
      startDate: "",
      endDate: "",
      predecessor: "",
      progress: 0,
      logDate: new Date().toISOString().split('T')[0],
      notes: "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
    setFormData({
      taskName: "",
      startDate: "",
      endDate: "",
      predecessor: "",
      progress: 0,
      logDate: new Date().toISOString().split('T')[0],
      notes: "",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.taskName.trim()) {
      errors.taskName = 'Task name is required';
    }

    if (!formData.logDate) {
      errors.logDate = 'Log date is required';
    }

    if (formData.progress < 0 || formData.progress > 100) {
      errors.progress = 'Progress must be between 0 and 100';
    }

    // Validate dates if provided
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate > endDate) {
        errors.endDate = 'End date must be after start date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingLog) {
        await updateLog({
          id: editingLog.id,
          ...formData,
        }).unwrap();
        showToast('Daily log updated successfully', 'success');
      } else {
        await createLog({
          projectId,
          ...formData,
        }).unwrap();
        showToast('Daily log created successfully', 'success');
      }
      
      handleCloseModal();
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to save daily log', 'error');
    }
  };

  const handleDelete = async (logId: string) => {
    try {
      await deleteLog({ id: logId, projectId }).unwrap();
      showToast('Daily log deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to delete daily log', 'error');
    }
  };

  const handleBulkDelete = async (logIds: string[]) => {
    try {
      // Delete each log individually since there's no bulk delete API endpoint
      await Promise.all(
        logIds.map(logId => deleteLog({ id: logId, projectId }).unwrap())
      );
      showToast(`Successfully deleted ${logIds.length} daily log${logIds.length !== 1 ? 's' : ''}`, 'success');
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to delete daily logs', 'error');
    }
  };

  // Define table columns
  const columns: ColumnDef<DailyLog>[] = [
    {
      accessorKey: "logDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Log Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("logDate") as string;
        return new Date(date).toLocaleDateString();
      },
    },
    {
      accessorKey: "taskName",
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
      accessorKey: "predecessor",
      header: "Predecessor",
      cell: ({ row }) => {
        const predecessor = row.getValue("predecessor") as string | null;
        return predecessor ? (
          <span className="text-sm">{predecessor}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
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
        const progress = parseFloat(row.getValue("progress") as string);
        return (
          <div className="flex items-center space-x-2">
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdByName",
      header: "Created By",
      cell: ({ row }) => {
        const createdBy = row.getValue("createdByName") as string;
        return <span className="text-sm">{createdBy}</span>;
      },
    },
  ];

  // Render modal form (add/edit)
  const renderModal = () => (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingLog ? 'Edit Daily Log' : 'Add New Daily Log'}
          </DialogTitle>
          <DialogDescription>
            {editingLog
              ? 'Update the daily log information.'
              : 'Create a new daily log entry for this project.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name and Log Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taskName">Task Name *</Label>
              <Input
                id="taskName"
                value={formData.taskName}
                onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                placeholder="Enter task name"
                className={formErrors.taskName ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.taskName && (
                <p className="text-sm text-red-500 mt-1">{formErrors.taskName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="logDate">Log Date *</Label>
              <Input
                id="logDate"
                type="date"
                value={formData.logDate}
                onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                className={formErrors.logDate ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.logDate && (
                <p className="text-sm text-red-500 mt-1">{formErrors.logDate}</p>
              )}
            </div>
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={isFormLoading}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={formErrors.endDate ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.endDate && (
                <p className="text-sm text-red-500 mt-1">{formErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Predecessor and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="predecessor">Predecessor (Optional)</Label>
              <Input
                id="predecessor"
                value={formData.predecessor}
                onChange={(e) => setFormData({ ...formData, predecessor: e.target.value })}
                placeholder="Enter predecessor tasks"
                disabled={isFormLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Reference other task numbers or names
              </p>
            </div>

            <div>
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                className={formErrors.progress ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.progress && (
                <p className="text-sm text-red-500 mt-1">{formErrors.progress}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter any additional notes or details"
              rows={3}
              disabled={isFormLoading}
            />
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {(formError as any)?.data?.error || 'An error occurred'}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCloseModal}
            disabled={isFormLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isFormLoading}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>
              {isFormLoading 
                ? (editingLog ? 'Updating...' : 'Creating...') 
                : (editingLog ? 'Update Log' : 'Create Log')
              }
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render list view
  const renderListView = () => (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Daily Logs</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track daily progress and task updates for this project
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsBulkUploadModalOpen(true)}
              variant="outline"
              className="flex items-center space-x-2"
              size="sm"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>
            <Button 
              onClick={handleAdd} 
              className="flex items-center space-x-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Log Entry</span>
            </Button>
          </div>
        </div>
      </div>

      <AdminDataTable
        data={allLogs}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(log) => log.id}
        exportFilename="daily-logs"
        exportHeaders={['Log Date', 'Task Name', 'Start Date', 'End Date', 'Predecessor', 'Progress (%)', 'Notes', 'Created By']}
        getExportData={(log) => [
          new Date(log.logDate).toLocaleDateString(),
          log.taskName,
          log.startDate ? new Date(log.startDate).toLocaleDateString() : '',
          log.endDate ? new Date(log.endDate).toLocaleDateString() : '',
          log.predecessor || '',
          log.progress + '%',
          log.notes || '',
          log.createdByName,
        ]}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );

  return (
    <div>
      {renderListView()}
      {renderModal()}
      
      <DailyLogsBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}