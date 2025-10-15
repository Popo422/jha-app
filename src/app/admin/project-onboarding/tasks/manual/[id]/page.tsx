"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  completed: boolean;
}

export default function OnboardingManualTasksPage() {
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
    progress: "0",
    completed: false
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { showToast } = useToast();
  const [createTask] = useCreateProjectTaskMutation();
  const [bulkImportTasks] = useBulkImportTasksMutation();

  const resetForm = () => {
    setFormData({
      taskNumber: "",
      name: "",
      durationDays: "",
      startDate: "",
      endDate: "",
      predecessors: "",
      progress: "0",
      completed: false
    });
  };

  const getNextTaskNumber = () => {
    if (tasks.length === 0) return 1;
    return Math.max(...tasks.map(t => t.taskNumber)) + 1;
  };

  const handleEditTask = (index: number) => {
    if (index === -1) {
      // Add new task
      setEditingIndex(-1);
      resetForm();
      setFormData(prev => ({ ...prev, taskNumber: getNextTaskNumber().toString() }));
    } else {
      // Edit existing task
      const task = tasks[index];
      setEditingIndex(index);
      setFormData({
        taskNumber: task.taskNumber.toString(),
        name: task.name,
        durationDays: task.durationDays?.toString() || "",
        startDate: task.startDate || "",
        endDate: task.endDate || "",
        predecessors: task.predecessors || "",
        progress: task.progress.toString(),
        completed: task.completed
      });
    }
    setIsDialogOpen(true);
  };

  const handleDeleteTask = (index: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveTask = () => {
    if (!formData.name.trim()) {
      showToast('Task name is required', 'error');
      return;
    }

    const taskNumber = parseInt(formData.taskNumber);
    if (isNaN(taskNumber) || taskNumber < 1) {
      showToast('Task number must be a valid number', 'error');
      return;
    }

    // Check for duplicate task numbers (excluding current task if editing)
    const isDuplicate = tasks.some((task, index) => 
      task.taskNumber === taskNumber && index !== editingIndex
    );
    
    if (isDuplicate) {
      showToast('Task number already exists', 'error');
      return;
    }

    const finalProgress = formData.completed ? 100 : (parseFloat(formData.progress) || 0);
    const newTask: ManualTask = {
      tempId: editingIndex === -1 ? `temp-${Date.now()}` : tasks[editingIndex!].tempId,
      taskNumber,
      name: formData.name.trim(),
      durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      predecessors: formData.predecessors.trim() || undefined,
      progress: finalProgress,
      completed: formData.completed
    };

    if (editingIndex === -1) {
      // Add new task
      setTasks(prev => [...prev, newTask].sort((a, b) => a.taskNumber - b.taskNumber));
    } else {
      // Update existing task
      setTasks(prev => {
        const updated = [...prev];
        if (editingIndex !== null) {
          updated[editingIndex] = newTask;
        }
        return updated.sort((a, b) => a.taskNumber - b.taskNumber);
      });
    }

    setIsDialogOpen(false);
    setEditingIndex(null);
    resetForm();
    showToast(editingIndex === -1 ? 'Task added successfully' : 'Task updated successfully', 'success');
  };

  const handleFinishAndImport = async () => {
    if (tasks.length === 0) {
      showToast('Please add at least one task before finishing', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const tasksToImport = tasks.map(task => ({
        taskNumber: task.taskNumber,
        name: task.name,
        durationDays: task.durationDays,
        startDate: task.startDate,
        endDate: task.endDate,
        predecessors: task.predecessors,
        progress: task.progress,
        completed: task.completed
      }));

      await bulkImportTasks({
        projectId,
        tasks: tasksToImport,
        replaceExisting: true
      }).unwrap();

      showToast(`Successfully imported ${tasks.length} tasks!`, 'success');
      
      // Navigate to project dashboard
      router.push(`/admin/project-dashboard/${projectId}`);
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to import tasks', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBackToOnboarding = () => {
    // Store current state
    sessionStorage.setItem('onboarding-manual-tasks', JSON.stringify(tasks));
    router.push('/admin/project-onboarding');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToOnboarding}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
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
                            <span>{task.completed ? '100' : task.progress}% complete</span>
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

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBackToOnboarding}
              >
                Back to Setup
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/project-dashboard/${projectId}`)}
                >
                  Skip Tasks - Finish Later
                </Button>
                <Button
                  onClick={handleFinishAndImport}
                  disabled={tasks.length === 0 || isImporting}
                  className="flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importing Tasks...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Finish & Import {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Task Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIndex === -1 ? 'Add New Task' : `Edit Task #${formData.taskNumber}`}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taskNumber">Task Number</Label>
                  <Input
                    id="taskNumber"
                    type="number"
                    min="1"
                    value={formData.taskNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, taskNumber: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="progress">Progress (%)</Label>
                  <Input
                    id="progress"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData(prev => ({ ...prev, progress: e.target.value }))}
                    placeholder="0"
                    disabled={formData.completed}
                  />
                  {formData.completed && (
                    <p className="text-xs text-gray-500 mt-1">Progress is automatically set to 100% when marked as completed</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="name">Task Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter task name"
                />
              </div>

              <div>
                <Label htmlFor="durationDays">Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min="0"
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationDays: e.target.value }))}
                  placeholder="Enter duration in days"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="predecessors">Dependencies</Label>
                <Input
                  id="predecessors"
                  placeholder="e.g., 1,2,3 or 1FS+5 days"
                  value={formData.predecessors}
                  onChange={(e) => setFormData(prev => ({ ...prev, predecessors: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify which tasks must complete before this one starts
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-completed"
                  checked={formData.completed}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    completed: !!checked,
                    progress: checked ? "100" : prev.progress
                  }))}
                />
                <Label htmlFor="edit-completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Mark as Completed
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTask} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingIndex === -1 ? 'Add Task' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
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