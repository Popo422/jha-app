"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  BarChart3,
  Save,
  CheckCircle,
  AlertTriangle,
  Plus,
  Brain
} from "lucide-react";
import {
  useBulkImportTasksMutation,
} from "@/lib/features/project-tasks/projectTasksApi";
import { useToast } from "@/components/ui/toast";

interface ExtractedTask {
  taskNumber: number;
  name: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  predecessors?: string;
  progress?: number;
}

export default function ReviewTasksPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    durationDays: "",
    startDate: "",
    endDate: "",
    predecessors: "",
    progress: "0"
  });

  const { showToast } = useToast();
  const [bulkImportTasks, { isLoading: isImporting }] = useBulkImportTasksMutation();

  // Load tasks from URL parameters
  useEffect(() => {
    const tasksParam = searchParams.get('tasks');
    if (tasksParam) {
      try {
        const decodedTasks = JSON.parse(decodeURIComponent(tasksParam));
        setTasks(decodedTasks);
      } catch (error) {
        showToast("Failed to load extracted tasks", "error");
        router.back();
      }
    }
  }, [searchParams, showToast, router]);

  const resetForm = () => {
    setFormData({
      name: "",
      durationDays: "",
      startDate: "",
      endDate: "",
      predecessors: "",
      progress: "0"
    });
  };

  const handleEditTask = (index: number) => {
    const task = tasks[index];
    setFormData({
      name: task.name,
      durationDays: task.durationDays?.toString() || "",
      startDate: task.startDate?.split('T')[0] || "",
      endDate: task.endDate?.split('T')[0] || "",
      predecessors: task.predecessors || "",
      progress: task.progress?.toString() || "0"
    });
    setEditingIndex(index);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const updatedTasks = [...tasks];
    updatedTasks[editingIndex] = {
      ...updatedTasks[editingIndex],
      name: formData.name,
      durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      predecessors: formData.predecessors || undefined,
      progress: parseInt(formData.progress)
    };

    setTasks(updatedTasks);
    setEditingIndex(null);
    resetForm();
    showToast("Task updated successfully", "success");
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
    showToast("Task deleted", "success");
  };

  const handleAddNewTask = () => {
    if (!formData.name.trim()) {
      showToast("Task name is required", "error");
      return;
    }

    const newTask: ExtractedTask = {
      taskNumber: tasks.length + 1,
      name: formData.name,
      durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      predecessors: formData.predecessors || undefined,
      progress: parseInt(formData.progress)
    };

    setTasks([...tasks, newTask]);
    resetForm();
    showToast("Task added successfully", "success");
  };

  const handleImportTasks = async () => {
    if (tasks.length === 0) {
      showToast("No tasks to import", "error");
      return;
    }

    try {
      const result = await bulkImportTasks({
        projectId,
        tasks,
        replaceExisting
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

  const getProgressColor = (progress?: number) => {
    const prog = progress || 0;
    if (prog >= 100) return "bg-green-100 text-green-800 border-green-200";
    if (prog >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
    if (prog > 0) return "bg-yellow-100 text-yellow-800 border-yellow-200";
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
            Back to Upload
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Review AI Extracted Tasks
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review and edit the tasks before importing to your project
              </p>
            </div>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please review all extracted tasks carefully. You can edit, delete, or add new tasks before importing.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingIndex !== null ? 'Edit Task' : 'Add New Task'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Task Name *</Label>
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
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationDays: e.target.value }))}
                  placeholder="e.g., 5"
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
                <Label htmlFor="predecessors">Predecessors</Label>
                <Input
                  id="predecessors"
                  placeholder="e.g., 1,2,3 or 1FS+5 days"
                  value={formData.predecessors}
                  onChange={(e) => setFormData(prev => ({ ...prev, predecessors: e.target.value }))}
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
                />
              </div>

              <div className="flex gap-2 pt-4">
                {editingIndex !== null ? (
                  <>
                    <Button onClick={handleSaveEdit} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
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
                  </>
                ) : (
                  <Button onClick={handleAddNewTask} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Extracted Tasks ({tasks.length})</CardTitle>
                {tasks.length > 0 && (
                  <Button 
                    onClick={handleImportTasks}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>Importing...</>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Import All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No tasks extracted</p>
                  <p className="text-sm">Try uploading a different file</p>
                </div>
              ) : (
                <>
                  {/* Replace Existing Option */}
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={(e) => setReplaceExisting(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">
                        Replace all existing tasks for this project
                      </span>
                    </label>
                    <p className="text-xs text-yellow-700 mt-1">
                      Warning: This will delete all current tasks and replace them with these extracted tasks
                    </p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tasks.map((task, index) => (
                      <div 
                        key={`${task.taskNumber}-${index}`}
                        className={`p-4 border rounded-lg ${
                          editingIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{task.taskNumber}
                            </Badge>
                            <h4 className="font-medium">{task.name}</h4>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(index)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span>{task.durationDays ? `${task.durationDays} days` : '-'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3 text-gray-500" />
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getProgressColor(task.progress)}`}
                            >
                              {task.progress || 0}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span>{formatDate(task.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span>{formatDate(task.endDate)}</span>
                          </div>
                        </div>

                        {task.predecessors && (
                          <div className="mt-2 text-xs text-gray-600">
                            Depends on: {task.predecessors}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}