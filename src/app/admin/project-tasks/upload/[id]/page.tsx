"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Upload, 
  Link, 
  Brain, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Download,
  X,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  BarChart3,
  Save,
  Plus
} from "lucide-react";
import {
  useUploadScheduleMutation,
  useExtractTasksMutation,
  useBulkImportTasksMutation,
} from "@/lib/features/project-tasks/projectTasksApi";
import { useToast } from "@/components/ui/toast";

type UploadStep = 'upload' | 'extract' | 'review' | 'import';

export default function UploadTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [activeStep, setActiveStep] = useState<UploadStep>('upload');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [formData, setFormData] = useState({
    taskNumber: "",
    name: "",
    durationDays: "",
    startDate: "",
    endDate: "",
    predecessors: "",
    progress: "0"
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [uploadSchedule, { isLoading: isUploading }] = useUploadScheduleMutation();
  const [extractTasks, { isLoading: isExtracting }] = useExtractTasksMutation();
  const [bulkImportTasks, { isLoading: isImporting }] = useBulkImportTasksMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveUrl = () => {
    setFileUrl('');
  };

  const handleUpload = async () => {
    try {
      let result;
      
      if (uploadType === 'file' && selectedFile) {
        result = await uploadSchedule({ file: selectedFile }).unwrap();
      } else if (uploadType === 'url' && fileUrl) {
        result = await uploadSchedule({ url: fileUrl }).unwrap();
      } else {
        showToast("Please select a file or enter a URL", "error");
        return;
      }

      setUploadedFileUrl(result.fileUrl);
      setActiveStep('extract');
      showToast("File uploaded successfully", "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Upload failed", "error");
    }
  };

  const handleExtract = async () => {
    try {
      const result = await extractTasks({
        fileUrl: uploadedFileUrl,
        projectId
      }).unwrap();

      setExtractedTasks(result.extractedTasks);
      setActiveStep('review');
      showToast(`Extracted ${result.extractedTasks.length} tasks`, "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Extraction failed", "error");
    }
  };

  const handleContinueToReview = () => {
    setActiveStep('review');
  };

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

  const handleEditTask = (index: number) => {
    if (index === -1) {
      // Adding new task
      resetForm();
      setEditingIndex(-1);
    } else {
      // Editing existing task
      const task = extractedTasks[index];
      setFormData({
        taskNumber: task.taskNumber?.toString() || "",
        name: task.name,
        durationDays: task.durationDays?.toString() || "",
        startDate: task.startDate?.split('T')[0] || "",
        endDate: task.endDate?.split('T')[0] || "",
        predecessors: task.predecessors || "",
        progress: task.progress?.toString() || "0"
      });
      setEditingIndex(index);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    if (!formData.name.trim()) {
      showToast("Task name is required", "error");
      return;
    }

    if (editingIndex === -1) {
      // Adding new task
      const newTask = {
        taskNumber: formData.taskNumber ? parseInt(formData.taskNumber) : extractedTasks.length + 1,
        name: formData.name,
        durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        predecessors: formData.predecessors || undefined,
        progress: parseInt(formData.progress)
      };

      setExtractedTasks([...extractedTasks, newTask]);
      showToast("Task added successfully", "success");
    } else {
      // Editing existing task
      const updatedTasks = [...extractedTasks];
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

      setExtractedTasks(updatedTasks);
      showToast("Task updated successfully", "success");
    }

    setEditingIndex(null);
    resetForm();
  };

  const handleDeleteTask = (index: number) => {
    if (index < 0 || index >= extractedTasks.length) {
      showToast("Invalid task index", "error");
      return;
    }

    const updatedTasks = extractedTasks.filter((_, i) => i !== index);
    // Renumber tasks
    const renumberedTasks = updatedTasks.map((task, i) => ({
      ...task,
      taskNumber: i + 1
    }));
    
    setExtractedTasks(renumberedTasks);
    
    // Reset editing state if we were editing the deleted task or a task that shifted
    if (editingIndex !== null) {
      if (editingIndex === index) {
        // We were editing the deleted task
        setEditingIndex(null);
        resetForm();
      } else if (editingIndex > index) {
        // We were editing a task that shifted down by one
        setEditingIndex(editingIndex - 1);
      }
    }
    
    showToast(`Task #${index + 1} deleted`, "success");
  };


  const handleImportTasks = async () => {
    if (extractedTasks.length === 0) {
      showToast("No tasks to import", "error");
      return;
    }

    try {
      const result = await bulkImportTasks({
        projectId,
        tasks: extractedTasks,
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

  const getStepProgress = () => {
    switch (activeStep) {
      case 'upload': return 0;
      case 'extract': return 33;
      case 'review': return 66;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
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
            Upload Project Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload your schedule file and let AI extract the tasks
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="mb-4" />
            
            <div className="flex justify-between">
              {[
                { key: 'upload', label: 'Upload File', icon: Upload },
                { key: 'extract', label: 'AI Analysis', icon: Brain },
                { key: 'review', label: 'Review & Edit', icon: FileText }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2
                    ${activeStep === key ? 'bg-blue-600 text-white border-blue-600' :
                      getStepProgress() > (key === 'extract' ? 0 : key === 'review' ? 33 : 66) ?
                      'bg-green-600 text-white border-green-600' :
                      'bg-gray-200 text-gray-600 border-gray-300'}
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs mt-1 text-center">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">
            
            {activeStep === 'upload' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2">Upload Your Schedule File</h2>
                  <p className="text-gray-600">Choose how you'd like to provide your project schedule</p>
                </div>

                <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as 'file' | 'url')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="url">From URL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="file" className="space-y-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      {selectedFile ? (
                        <div className="space-y-3">
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                            <div>
                              <p className="text-lg font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={handleRemoveFile}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500">
                            Click to select a different file or drag and drop to replace
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg text-gray-600 mb-2">
                            Drop your schedule file here, or click to select
                          </p>
                          <p className="text-sm text-gray-500">
                            Supports PDF, Excel, CSV, and images up to 50MB
                          </p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                    />
                  </TabsContent>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div>
                      <Label htmlFor="fileUrl" className="text-base">File URL</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="fileUrl"
                          placeholder="https://example.com/schedule.pdf"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                        />
                        {fileUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleRemoveUrl}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={handleUpload}
                    disabled={isUploading || (!selectedFile && !fileUrl)}
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload & Continue
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 'extract' && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                    <Brain className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold mb-4">AI Analysis in Progress</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Our AI is analyzing your schedule and extracting task information...
                  </p>
                </div>
                
                <Button 
                  onClick={handleExtract}
                  disabled={isExtracting}
                  size="lg"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Tasks...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Start AI Extraction
                    </>
                  )}
                </Button>
              </div>
            )}

            {activeStep === 'review' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Review Extracted Tasks</h2>
                  <p className="text-lg text-gray-600">
                    Found {extractedTasks.length} tasks - review and edit as needed
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Tasks ({extractedTasks.length})</CardTitle>
                      <Button onClick={() => handleEditTask(-1)} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Task
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {extractedTasks.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No tasks extracted</p>
                        <p className="text-sm">Upload a different file or add tasks manually</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {extractedTasks.map((task, index) => (
                          <div 
                            key={index}
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
                                    <span>{task.progress || 0}% complete</span>
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

                {/* Replace Existing Option & Import Button */}
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleImportTasks}
                      disabled={isImporting || extractedTasks.length === 0}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Import {extractedTasks.length} Tasks
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

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
                  placeholder="Enter task name"
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
                <Button onClick={handleSaveEdit} className="flex-1">
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