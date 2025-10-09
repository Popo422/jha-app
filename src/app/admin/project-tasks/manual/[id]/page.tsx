"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  BarChart3,
  Save,
  CheckCircle
} from "lucide-react";
import {
  useCreateProjectTaskMutation,
  useBulkImportTasksMutation,
} from "@/lib/features/project-tasks/projectTasksApi";
import { useToast } from "@/components/ui/toast";

interface ManualTask {
  tempId: string;
  taskNumber: number;
  name: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  predecessors?: string;
  progress: number;
}

export default function ManualTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [tasks, setTasks] = useState<ManualTask[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    taskNumber: "",
    name: "",
    durationDays: "",
    startDate: "",
    endDate: "",
    predecessors: "",
    progress: "0"
  });

  const { showToast } = useToast();
  const [bulkImportTasks, { isLoading: isImporting }] = useBulkImportTasksMutation();

  const resetForm = () => {
    setFormData({
      taskNumber: "",
      name: "",
      durationDays: "",
      startDate: "",
      endDate: "",
      predecessors: "",
      progress: "0"
    });
  };

  const handleSaveTask = () => {
    if (editingIndex === null) return;

    if (!formData.name.trim()) {
      showToast("Task name is required", "error");
      return;
    }

    if (editingIndex === -1) {
      // Adding new task
      const newTask: ManualTask = {
        tempId: Date.now().toString(),
        taskNumber: formData.taskNumber ? parseInt(formData.taskNumber) : tasks.length + 1,
        name: formData.name,
        durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        predecessors: formData.predecessors || undefined,
        progress: parseInt(formData.progress)
      };

      setTasks([...tasks, newTask]);
      showToast("Task added successfully", "success");
    } else {
      // Editing existing task
      const updatedTasks = [...tasks];
      updatedTasks[editingIndex] = {
        ...updatedTasks[editingIndex],
        taskNumber: formData.taskNumber ? parseInt(formData.taskNumber) : updatedTasks[editingIndex].taskNumber,
        name: formData.name,
        durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        predecessors: formData.predecessors || undefined,
        progress: parseInt(formData.progress)
      };

      setTasks(updatedTasks);
      showToast("Task updated successfully", "success");
    }

    setEditingIndex(null);
    resetForm();
  };

  const handleEditTask = (index: number) => {
    if (index === -1) {
      // Adding new task
      resetForm();
      setEditingIndex(-1);
    } else {
      // Editing existing task
      const task = tasks[index];
      setFormData({
        taskNumber: task.taskNumber.toString(),
        name: task.name,
        durationDays: task.durationDays?.toString() || "",
        startDate: task.startDate || "",
        endDate: task.endDate || "",
        predecessors: task.predecessors || "",
        progress: task.progress.toString()
      });
      setEditingIndex(index);
    }
  };

  const handleDeleteTask = (index: number) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    // Renumber tasks
    const renumberedTasks = updatedTasks.map((task, i) => ({
      ...task,
      taskNumber: i + 1
    }));
    setTasks(renumberedTasks);
    
    if (editingIndex === index) {
      setEditingIndex(null);
      resetForm();
    }
  };

  const handleImportTasks = async () => {
    if (tasks.length === 0) {
      showToast("Please add at least one task", "error");
      return;
    }

    try {
      const tasksForImport = tasks.map(task => ({
        taskNumber: task.taskNumber,
        name: task.name,
        durationDays: task.durationDays,
        startDate: task.startDate,
        endDate: task.endDate,
        predecessors: task.predecessors,
        progress: task.progress
      }));

      const result = await bulkImportTasks({
        projectId,
        tasks: tasksForImport,
        replaceExisting: false
      }).unwrap();

      showToast(`Successfully imported ${result.importedCount} tasks`, "success");
      router.push(`/admin/project-dashboard/${projectId}`);
    } catch (error: any) {
      showToast(error?.data?.error || "Import failed", "error");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-100 text-green-800 border-green-200";
    if (progress >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
    if (progress > 0) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Add Tasks Manually
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create your project tasks one by one with full control
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Project Tasks ({tasks.length})</CardTitle>
              <Button onClick={() => handleEditTask(-1)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add New Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No tasks added yet</p>
                <p className="text-sm">Add your first task to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tasks.map((task, index) => (
                  <div 
                    key={task.tempId} 
                    className="p-4 border rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            #{task.taskNumber}
                          </Badge>
                          <h4 className="font-medium">{task.name}</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.durationDays ? `${task.durationDays} days` : 'No duration'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            <span>{task.progress}% complete</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(task.startDate) || 'No start date'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(task.endDate) || 'No end date'}</span>
                          </div>
                        </div>

                        {task.predecessors && (
                          <div className="mt-2 text-xs text-gray-500">
                            Dependencies: {task.predecessors}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(index)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Button */}
        {tasks.length > 0 && (
          <div className="flex justify-end">
            <Button 
              onClick={handleImportTasks}
              disabled={isImporting}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import {tasks.length} Tasks
                </>
              )}
            </Button>
          </div>
        )}

        {/* Edit/Add Task Dialog */}
        <Dialog open={editingIndex !== null} onOpenChange={(open) => {
          if (!open) {
            setEditingIndex(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIndex === -1 ? 'Add New Task' : 'Edit Task'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-taskNumber">Task Number *</Label>
                <Input
                  id="edit-taskNumber"
                  type="number"
                  value={formData.taskNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, taskNumber: e.target.value }))}
                  placeholder="e.g., 1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-name">Task Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Foundation excavation"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-durationDays">Duration (Days)</Label>
                <Input
                  id="edit-durationDays"
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationDays: e.target.value }))}
                  placeholder="e.g., 5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startDate">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-endDate">End Date</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-predecessors">Dependencies</Label>
                <Input
                  id="edit-predecessors"
                  placeholder="e.g., 1,2,3 or 1FS+5 days"
                  value={formData.predecessors}
                  onChange={(e) => setFormData(prev => ({ ...prev, predecessors: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData(prev => ({ ...prev, progress: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTask} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingIndex === -1 ? 'Add Task' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingIndex(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}