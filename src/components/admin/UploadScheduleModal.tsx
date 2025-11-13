"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Link, 
  Brain, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Download
} from "lucide-react";
import {
  useUploadScheduleMutation,
  useExtractTasksMutation,
  useBulkImportTasksMutation,
  type ExtractTasksResponse
} from "@/lib/features/project-tasks/projectTasksApi";
import { useToast } from "@/components/ui/toast";

interface UploadScheduleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

type UploadStep = 'upload' | 'extract' | 'review' | 'import' | 'complete';

export default function UploadScheduleModal({ 
  isOpen, 
  onOpenChange, 
  projectId 
}: UploadScheduleModalProps) {
  const [activeStep, setActiveStep] = useState<UploadStep>('upload');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  
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

  const handleImport = async () => {
    try {
      const result = await bulkImportTasks({
        projectId,
        tasks: extractedTasks,
        replaceExisting
      }).unwrap();

      setImportResults(result);
      setActiveStep('complete');
      showToast(`Imported ${result.importedCount} tasks successfully`, "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Import failed", "error");
    }
  };

  const resetModal = () => {
    setActiveStep('upload');
    setSelectedFile(null);
    setFileUrl('');
    setUploadedFileUrl('');
    setExtractedTasks([]);
    setImportResults(null);
    setReplaceExisting(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const getStepProgress = () => {
    switch (activeStep) {
      case 'upload': return 0;
      case 'extract': return 25;
      case 'review': return 50;
      case 'import': return 75;
      case 'complete': return 100;
      default: return 0;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Upload & Extract Project Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="w-full" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {[
              { key: 'upload', label: 'Upload', icon: Upload },
              { key: 'extract', label: 'Extract', icon: Brain },
              { key: 'review', label: 'Review', icon: FileText },
              { key: 'import', label: 'Import', icon: Download },
              { key: 'complete', label: 'Complete', icon: CheckCircle }
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2
                  ${activeStep === key ? 'bg-blue-600 text-white border-blue-600' :
                    ['extract', 'review', 'import', 'complete'].indexOf(activeStep) > 
                    ['extract', 'review', 'import', 'complete'].indexOf(key as any) ?
                    'bg-green-600 text-white border-green-600' :
                    'bg-gray-200 text-gray-600 border-gray-300'}
                `}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs mt-1">{label}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          {activeStep === 'upload' && (
            <div className="space-y-4">
              <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as 'file' | 'url')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="url">From URL</TabsTrigger>
                </TabsList>
                
                <TabsContent value="file" className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">
                          Drop your schedule file here, or click to select
                        </p>
                        <p className="text-xs text-gray-500">
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
                    <Label htmlFor="fileUrl">File URL</Label>
                    <Input
                      id="fileUrl"
                      placeholder="https://example.com/schedule.pdf"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button 
                onClick={handleUpload}
                disabled={isUploading || (!selectedFile && !fileUrl)}
                className="w-full"
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
          )}

          {activeStep === 'extract' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI Analysis in Progress</h3>
                <p className="text-sm text-gray-600">
                  Our AI is analyzing your schedule and extracting task information...
                </p>
              </div>
              
              <Button 
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full"
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Review Extracted Tasks</h3>
                <Badge variant="outline">
                  {extractedTasks.length} tasks found
                </Badge>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please review the extracted tasks before importing. You can edit them after import if needed.
                </AlertDescription>
              </Alert>

              <div className="max-h-60 overflow-y-auto border rounded-md">
                <div className="space-y-2 p-4">
                  {extractedTasks.slice(0, 10).map((task, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">#{task.taskNumber}: {task.name}</span>
                        {task.durationDays && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({task.durationDays} days)
                          </span>
                        )}
                      </div>
                      {task.predecessors && (
                        <Badge variant="outline" className="text-xs">
                          Depends: {task.predecessors}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {extractedTasks.length > 10 && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      ... and {extractedTasks.length - 10} more tasks
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="replaceExisting"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="replaceExisting" className="text-sm">
                  Replace all existing tasks for this project
                </Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setActiveStep('extract')}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Extract
                </Button>
                <Button 
                  onClick={() => setActiveStep('import')}
                  className="flex-1"
                >
                  Continue to Import
                </Button>
              </div>
            </div>
          )}

          {activeStep === 'import' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Download className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ready to Import</h3>
                <p className="text-sm text-gray-600">
                  {extractedTasks.length} tasks will be imported to your project
                  {replaceExisting && " (replacing existing tasks)"}
                </p>
              </div>
              
              <Button 
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing Tasks...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import Tasks
                  </>
                )}
              </Button>
            </div>
          )}

          {activeStep === 'complete' && importResults && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Import Complete!</h3>
                <p className="text-sm text-gray-600">
                  Successfully imported {importResults.importedCount} of {importResults.totalProvided} tasks
                </p>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {importResults.errors.length} tasks had issues and were skipped
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleClose} className="w-full">
                Close & View Tasks
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}