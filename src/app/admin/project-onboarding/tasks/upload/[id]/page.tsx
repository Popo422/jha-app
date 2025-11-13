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

export default function OnboardingUploadTasksPage() {
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
  const [formData, setFormData] = useState({
    taskNumber: "",
    name: "",
    durationDays: "",
    startDate: "",
    endDate: "",
    predecessors: "",
    progress: "0"
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [uploadSchedule, { isLoading: isUploading }] = useUploadScheduleMutation();
  const [extractTasks, { isLoading: isExtracting }] = useExtractTasksMutation();
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileUrl('');
    }
  };

  const handleUpload = async () => {
    try {
      let result;
      if (uploadType === 'file' && selectedFile) {
        result = await uploadSchedule({ file: selectedFile }).unwrap();
      } else if (uploadType === 'url' && fileUrl.trim()) {
        result = await uploadSchedule({ url: fileUrl.trim() }).unwrap();
      } else {
        showToast('Please select a file or enter a URL', 'error');
        return;
      }

      setUploadedFileUrl(result.fileUrl);
      setActiveStep('extract');
      showToast('File uploaded successfully! Ready for AI extraction.', 'success');
    } catch (error: any) {
      showToast(error?.data?.error || 'Upload failed', 'error');
    }
  };

  const handleExtract = async () => {
    if (!uploadedFileUrl) {
      showToast('No file uploaded', 'error');
      return;
    }

    try {
      const result = await extractTasks({
        fileUrl: uploadedFileUrl,
        projectId
      }).unwrap();

      setExtractedTasks(result.extractedTasks || []);
      setActiveStep('review');
      showToast(`Successfully extracted ${result.extractedTasks?.length || 0} tasks!`, 'success');
    } catch (error: any) {
      showToast(error?.data?.error || 'Extraction failed', 'error');
    }
  };

  const handleEditTask = (index: number) => {
    if (index === -1) {
      // Add new task
      setEditingIndex(-1);
      resetForm();
      const nextTaskNumber = extractedTasks.length > 0 
        ? Math.max(...extractedTasks.map(t => t.taskNumber || 0)) + 1 
        : 1;
      setFormData(prev => ({ ...prev, taskNumber: nextTaskNumber.toString() }));
    } else {
      // Edit existing task
      const task = extractedTasks[index];
      setEditingIndex(index);
      setFormData({
        taskNumber: (task.taskNumber || 0).toString(),
        name: task.name || "",
        durationDays: (task.durationDays || "").toString(),
        startDate: task.startDate || "",
        endDate: task.endDate || "",
        predecessors: task.predecessors || "",
        progress: (task.progress || 0).toString()
      });
    }
    setIsDialogOpen(true);
  };

  const handleDeleteTask = (index: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setExtractedTasks(prev => prev.filter((_, i) => i !== index));
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
    const isDuplicate = extractedTasks.some((task, index) => 
      (task.taskNumber || 0) === taskNumber && index !== editingIndex
    );
    
    if (isDuplicate) {
      showToast('Task number already exists', 'error');
      return;
    }

    const newTask = {
      taskNumber,
      name: formData.name.trim(),
      durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      predecessors: formData.predecessors.trim() || undefined,
      progress: parseFloat(formData.progress) || 0
    };

    if (editingIndex === -1) {
      // Add new task
      setExtractedTasks(prev => [...prev, newTask].sort((a, b) => (a.taskNumber || 0) - (b.taskNumber || 0)));
    } else {
      // Update existing task
      setExtractedTasks(prev => {
        const updated = [...prev];
        if (editingIndex !== null) {
          updated[editingIndex] = newTask;
        }
        return updated.sort((a, b) => (a.taskNumber || 0) - (b.taskNumber || 0));
      });
    }

    setIsDialogOpen(false);
    setEditingIndex(null);
    resetForm();
    showToast(editingIndex === -1 ? 'Task added successfully' : 'Task updated successfully', 'success');
  };

  const handleImport = async () => {
    if (extractedTasks.length === 0) {
      showToast('No tasks to import', 'error');
      return;
    }

    try {
      await bulkImportTasks({
        projectId,
        tasks: extractedTasks,
        replaceExisting: true
      }).unwrap();

      setActiveStep('import');
      showToast(`Successfully imported ${extractedTasks.length} tasks!`, 'success');
      
      // Navigate to project dashboard after a brief delay
      setTimeout(() => {
        router.push(`/admin/project-dashboard/${projectId}`);
      }, 2000);
    } catch (error: any) {
      showToast(error?.data?.error || 'Import failed', 'error');
    }
  };

  const handleBackToOnboarding = () => {
    router.push('/admin/project-onboarding');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Your Schedule File
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as 'file' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="url">From URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              {selectedFile ? (
                <div>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Click to select a file</p>
                  <p className="text-sm text-gray-500">Supports Excel, PDF, MS Project, and more</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.pdf,.mpp,.csv"
              onChange={handleFileSelect}
            />
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <div>
              <Label htmlFor="fileUrl">File URL</Label>
              <Input
                id="fileUrl"
                placeholder="https://example.com/schedule.xlsx"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button 
          onClick={handleUpload}
          disabled={isUploading || (uploadType === 'file' && !selectedFile) || (uploadType === 'url' && !fileUrl.trim())}
          className="w-full mt-6"
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
      </CardContent>
    </Card>
  );

  const renderExtractStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Task Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div>
          <p className="text-lg">Ready to extract tasks from your uploaded file</p>
          <p className="text-sm text-gray-500">Our AI will analyze your schedule and extract tasks automatically</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium mb-2">What our AI can extract:</h4>
          <ul className="text-sm text-left space-y-1">
            <li>• Task names and descriptions</li>
            <li>• Duration and dates</li>
            <li>• Dependencies between tasks</li>
            <li>• Progress percentages</li>
            <li>• Task numbers and sequencing</li>
          </ul>
        </div>

        <Button 
          onClick={handleExtract}
          disabled={isExtracting}
          size="lg"
          className="w-full max-w-md"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Extracting Tasks...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5 mr-2" />
              Extract Tasks with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Review & Edit Extracted Tasks ({extractedTasks.length})</CardTitle>
          <Button onClick={() => handleEditTask(-1)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {extractedTasks.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p>No tasks were extracted from the file</p>
            <p className="text-sm text-gray-500">You can add tasks manually or try uploading a different file</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedTasks.map((task, index) => (
              <div key={index} className="p-4 border rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{task.taskNumber || index + 1}
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

        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setActiveStep('upload')}
          >
            Upload Different File
          </Button>
          
          <Button
            onClick={handleImport}
            disabled={extractedTasks.length === 0}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Import {extractedTasks.length} Task{extractedTasks.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderImportStep = () => (
    <Card>
      <CardContent className="text-center py-12">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold mb-2">Tasks Imported Successfully!</h2>
        <p className="text-gray-600 mb-4">
          Your {extractedTasks.length} tasks have been imported and are ready to use.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to your project dashboard...
        </p>
      </CardContent>
    </Card>
  );

  const getStepProgress = () => {
    switch (activeStep) {
      case 'upload': return 25;
      case 'extract': return 50;
      case 'review': return 75;
      case 'import': return 100;
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
            onClick={handleBackToOnboarding}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            AI Schedule Extraction
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload your schedule file and let AI extract tasks automatically
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Upload</span>
            <span>Extract</span>
            <span>Review</span>
            <span>Import</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Step Content */}
        {activeStep === 'upload' && renderUploadStep()}
        {activeStep === 'extract' && renderExtractStep()}
        {activeStep === 'review' && renderReviewStep()}
        {activeStep === 'import' && renderImportStep()}

        {/* Action Buttons */}
        {(activeStep === 'upload' || activeStep === 'extract') && (
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={handleBackToOnboarding}
            >
              Back to Setup
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/project-dashboard/${projectId}`)}
            >
              Skip Tasks - Finish Later
            </Button>
          </div>
        )}

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
                  />
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