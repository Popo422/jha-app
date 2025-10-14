"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FolderOpen, 
  Upload, 
  Plus,
  Calendar,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Building,
  MapPin,
  DollarSign,
  User,
  CheckCircle,
  Brain
} from "lucide-react";
import { useCreateProjectMutation } from "@/lib/features/projects/projectsApi";
import { useGetAdminUsersQuery } from "@/lib/features/admin-users/adminUsersApi";
import { useUploadProjectDocumentMutation, useBulkUploadProjectDocumentsMutation, useCreateProjectDocumentMutation } from "@/lib/features/project-documents/projectDocumentsApi";

type OnboardingStep = 'details' | 'documents' | 'schedule';

interface ProjectDetailsForm {
  name: string;
  location: string;
  projectManager: string;
  projectCost: string;
}

interface DocumentUpload {
  file: File;
  description: string;
  category: string;
}

const DOCUMENT_CATEGORIES = [
  'Plans & Drawings',
  'Specifications', 
  'Permits',
  'Safety Documents',
  'Reports',
  'Photos',
  'Contracts',
  'Other'
];

export default function ProjectOnboardingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('details');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);

  // Project details form
  const [projectForm, setProjectForm] = useState<ProjectDetailsForm>({
    name: '',
    location: '',
    projectManager: '',
    projectCost: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Documents
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Created project ID for subsequent steps
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // API hooks
  const { data: adminUsersData } = useGetAdminUsersQuery({
    fetchAll: true,
    authType: 'admin'
  });
  const [createProject, { isLoading: isCreatingProject }] = useCreateProjectMutation();
  const [uploadDocument] = useUploadProjectDocumentMutation();
  const [bulkUploadDocuments] = useBulkUploadProjectDocumentsMutation();
  const [createDocument] = useCreateProjectDocumentMutation();

  const adminUsers = adminUsersData?.adminUsers || [];

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('onboarding-state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setProjectForm(state.projectForm);
        setCreatedProjectId(state.createdProjectId);
        setCurrentStep(state.currentStep);
        setCompletedSteps(state.completedSteps);
        
        // Note: We can't restore the actual File objects, but we can show the metadata
        // The user would need to re-upload files if they want to change documents
        if (state.documents && state.documents.length > 0) {
          // Show a message that files need to be re-uploaded
          showToast(`Restored onboarding progress. Please re-upload documents if needed.`, 'info');
        }
        
        // Clear the saved state so it doesn't interfere with new onboarding flows
        sessionStorage.removeItem('onboarding-state');
      } catch (error) {
        console.error('Failed to restore onboarding state:', error);
      }
    }
  }, [showToast]);

  const getStepTitle = (step: OnboardingStep) => {
    switch (step) {
      case 'details': return 'Project Details';
      case 'documents': return 'Project Documents';
      case 'schedule': return 'Project Schedule';
      default: return '';
    }
  };

  const getStepIcon = (step: OnboardingStep) => {
    switch (step) {
      case 'details': return Building;
      case 'documents': return FileText;
      case 'schedule': return Calendar;
      default: return Building;
    }
  };

  const validateProjectDetails = () => {
    const errors: Record<string, string> = {};

    if (!projectForm.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!projectForm.location.trim()) {
      errors.location = 'Location is required';
    }
    if (!projectForm.projectManager.trim()) {
      errors.projectManager = 'Project manager is required';
    }
    if (projectForm.projectCost && isNaN(parseFloat(projectForm.projectCost))) {
      errors.projectCost = 'Project cost must be a valid number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProject = async () => {
    if (!validateProjectDetails()) return;

    try {
      const result = await createProject({
        name: projectForm.name,
        location: projectForm.location,
        projectManager: projectForm.projectManager,
        projectCost: projectForm.projectCost || undefined,
      }).unwrap();

      setCreatedProjectId(result.project.id);
      setCompletedSteps(prev => [...prev, 'details']);
      showToast('Project created successfully!', 'success');
      return true;
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to create project', 'error');
      return false;
    }
  };

  const handleDocumentUpload = async () => {
    if (!createdProjectId || documents.length === 0) return true; // Skip if no documents

    setUploadingDocs(true);
    try {
      if (documents.length === 1) {
        // Single file upload
        const doc = documents[0];
        const uploadResult = await uploadDocument({
          file: doc.file,
          projectId: createdProjectId,
          category: doc.category,
          description: doc.description
        }).unwrap();

        await createDocument({
          projectId: createdProjectId,
          name: uploadResult.fileData.name,
          description: uploadResult.fileData.description,
          category: uploadResult.fileData.category,
          fileType: uploadResult.fileData.fileType,
          fileSize: uploadResult.fileData.fileSize,
          url: uploadResult.fileData.url,
          blobKey: uploadResult.fileData.blobKey
        }).unwrap();
      } else {
        // Bulk upload
        const files = documents.map(doc => doc.file);
        const uploadResult = await bulkUploadDocuments({
          files,
          projectId: createdProjectId,
          category: 'Other',
          description: ''
        }).unwrap();

        // Create database records for each uploaded file
        const createPromises = uploadResult.uploadedFiles.map((fileData: any, index: number) => {
          const originalDoc = documents[index];
          return createDocument({
            projectId: createdProjectId,
            name: fileData.name,
            description: originalDoc.description || '',
            category: originalDoc.category || 'Other',
            fileType: fileData.fileType,
            fileSize: fileData.fileSize,
            url: fileData.url,
            blobKey: fileData.blobKey
          }).unwrap();
        });

        await Promise.all(createPromises);
      }

      setCompletedSteps(prev => [...prev, 'documents']);
      if (documents.length > 0) {
        showToast(`${documents.length} document(s) uploaded successfully!`, 'success');
      }
      return true;
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to upload documents', 'error');
      return false;
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'details':
        const projectCreated = await handleCreateProject();
        if (projectCreated) {
          setCurrentStep('documents');
        }
        break;
      case 'documents':
        const docsUploaded = await handleDocumentUpload();
        if (docsUploaded) {
          setCurrentStep('schedule');
        }
        break;
      case 'schedule':
        // This step handles navigation via the choice cards
        break;
    }
  };

  const handleSkip = () => {
    switch (currentStep) {
      case 'documents':
        setCompletedSteps(prev => [...prev, 'documents']);
        setCurrentStep('schedule');
        break;
      case 'schedule':
        // Navigate to project dashboard
        if (createdProjectId) {
          router.push(`/admin/project-dashboard/${createdProjectId}`);
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'documents':
        setCurrentStep('details');
        break;
      case 'schedule':
        setCurrentStep('documents');
        break;
    }
  };

  const handleAddFiles = (files: File[]) => {
    const newDocs = files.map(file => ({
      file,
      description: '',
      category: getAutoCategoryFromFile(file)
    }));
    setDocuments(prev => [...prev, ...newDocs]);
  };

  const getAutoCategoryFromFile = (file: File): string => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    if (fileType.startsWith('image/')) return 'Photos';
    if (/\.(dwg|dxf|cad)$/i.test(fileName)) return 'Plans & Drawings';
    if (/safety|hazard|incident/i.test(fileName)) return 'Safety Documents';
    if (/contract|agreement/i.test(fileName)) return 'Contracts';
    if (/permit|license/i.test(fileName)) return 'Permits';
    if (/spec|specification/i.test(fileName)) return 'Specifications';
    if (fileType === 'application/pdf') return 'Reports';
    
    return 'Other';
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const updateDocumentMeta = (index: number, field: 'description' | 'category', value: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleAddFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleScheduleChoice = (choice: 'manual' | 'upload') => {
    if (createdProjectId) {
      // Store the current state in sessionStorage so we can return to it
      sessionStorage.setItem('onboarding-state', JSON.stringify({
        projectForm,
        documents: documents.map(doc => ({
          name: doc.file.name,
          size: doc.file.size,
          type: doc.file.type,
          description: doc.description,
          category: doc.category
        })),
        createdProjectId,
        currentStep,
        completedSteps
      }));

      if (choice === 'manual') {
        router.push(`/admin/project-onboarding/tasks/manual/${createdProjectId}`);
      } else {
        router.push(`/admin/project-onboarding/tasks/upload/${createdProjectId}`);
      }
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-12">
      <div className="flex items-center space-x-4">
        {(['details', 'documents', 'schedule'] as OnboardingStep[]).map((step, index) => {
          const Icon = getStepIcon(step);
          const isCompleted = completedSteps.includes(step);
          const isCurrent = currentStep === step;
          
          return (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                isCompleted 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : isCurrent 
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <div className={`text-sm font-medium ${
                  isCompleted || isCurrent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                }`}>
                  Step {index + 1}
                </div>
                <div className={`text-lg font-semibold ${
                  isCompleted || isCurrent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                }`}>
                  {getStepTitle(step)}
                </div>
              </div>
              {index < 2 && (
                <div className={`w-16 h-0.5 mx-6 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderProjectDetailsStep = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <Building className="w-16 h-16 mx-auto text-blue-600" />
        <h1 className="text-3xl font-bold">Create Your Project</h1>
        <p className="text-lg text-muted-foreground">
          Let's start by setting up your project's basic information
        </p>
      </div>

      <Card className="p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 text-base">
              <Building className="w-5 h-5" />
              Project Name
            </Label>
            <Input
              id="name"
              value={projectForm.name}
              onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
              className={`text-base p-3 ${formErrors.name ? "border-red-500" : ""}`}
            />
            {formErrors.name && (
              <p className="text-sm text-red-500">{formErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5" />
              Location
            </Label>
            <Input
              id="location"
              value={projectForm.location}
              onChange={(e) => setProjectForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Enter project location"
              className={`text-base p-3 ${formErrors.location ? "border-red-500" : ""}`}
            />
            {formErrors.location && (
              <p className="text-sm text-red-500">{formErrors.location}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectManager" className="flex items-center gap-2 text-base">
              <User className="w-5 h-5" />
              Project Manager
            </Label>
            <Select 
              value={projectForm.projectManager} 
              onValueChange={(value) => setProjectForm(prev => ({ ...prev, projectManager: value }))}
            >
              <SelectTrigger className={`text-base p-3 h-12 ${formErrors.projectManager ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Select project manager" />
              </SelectTrigger>
              <SelectContent>
                {adminUsers.map((admin) => (
                  <SelectItem key={admin.id} value={admin.name}>
                    {admin.name} ({admin.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.projectManager && (
              <p className="text-sm text-red-500">{formErrors.projectManager}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectCost" className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5" />
              Project Budget (Optional)
            </Label>
            <Input
              id="projectCost"
              type="number"
              step="0.01"
              min="0"
              value={projectForm.projectCost}
              onChange={(e) => setProjectForm(prev => ({ ...prev, projectCost: e.target.value }))}
              placeholder="Enter project budget"
              className={`text-base p-3 ${formErrors.projectCost ? "border-red-500" : ""}`}
            />
            {formErrors.projectCost && (
              <p className="text-sm text-red-500">{formErrors.projectCost}</p>
            )}
            <p className="text-sm text-muted-foreground">
              This helps track spending and budget utilization
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <FileText className="w-16 h-16 mx-auto text-green-600" />
        <h1 className="text-3xl font-bold">Upload Project Documents</h1>
        <p className="text-lg text-muted-foreground">
          Add important project documents like plans, permits, and contracts (optional)
        </p>
      </div>

      <Card className="p-8">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer mb-8"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Drop files here or click to browse</h3>
          <p className="text-muted-foreground">Support for multiple files, up to 50MB each</p>
          <p className="text-sm text-muted-foreground mt-2">
            Supports: PDF, DWG, DXF, Images, Word docs, and more
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleAddFiles(Array.from(e.target.files))}
          />
        </div>

        {/* File List */}
        {documents.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Files to Upload ({documents.length})</h3>
              <Button
                variant="outline"
                onClick={() => setDocuments([])}
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-4 max-h-80 overflow-auto">
              {documents.map((doc, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <FileText className="w-6 h-6 text-gray-500 mt-1" />
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-base">{doc.file.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(doc.file.size)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveDocument(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Category</Label>
                          <Select
                            value={doc.category}
                            onValueChange={(value) => updateDocumentMeta(index, 'category', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Description (optional)</Label>
                          <Input
                            value={doc.description}
                            onChange={(e) => updateDocumentMeta(index, 'description', e.target.value)}
                            placeholder="Brief description"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No documents selected. You can skip this step or add files above.
            </p>
          </div>
        )}
      </Card>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <Calendar className="w-16 h-16 mx-auto text-purple-600" />
        <h1 className="text-3xl font-bold">Set Up Project Schedule</h1>
        <p className="text-lg text-muted-foreground">
          Choose how you'd like to create your project timeline and tasks
        </p>
      </div>

      {/* Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Entry Card */}
        <Card
          className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all hover:shadow-lg"
          onClick={() => handleScheduleChoice('manual')}
        >
          <CardContent className="p-8 text-center h-full flex flex-col justify-center">
            <Plus className="w-16 h-16 mx-auto text-blue-600 mb-6" />
            <h3 className="text-xl font-semibold mb-3">Add Tasks Manually</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Create project tasks one by one with full control over details, dependencies, and timeline
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Full control over task details
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Set dependencies and duration
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Timeline visualization
              </div>
            </div>
            <Button size="lg" className="mt-auto">
              <Plus className="w-5 h-5 mr-2" />
              Start Adding Tasks
            </Button>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card
          className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 cursor-pointer transition-all hover:shadow-lg"
          onClick={() => handleScheduleChoice('upload')}
        >
          <CardContent className="p-8 text-center h-full flex flex-col justify-center">
            <Brain className="w-16 h-16 mx-auto text-green-600 mb-6" />
            <h3 className="text-xl font-semibold mb-3">AI Schedule Extraction</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Upload your existing schedule file and let AI automatically extract and organize tasks
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Upload Excel, PDF, or MS Project files
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                AI extracts tasks automatically
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Review and edit before importing
              </div>
            </div>
            <Button size="lg" className="mt-auto">
              <Upload className="w-5 h-5 mr-2" />
              Upload Schedule File
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-8">
        <Button 
          variant="link" 
          onClick={() => {
            if (createdProjectId) {
              router.push(`/admin/project-dashboard/${createdProjectId}`);
            }
          }}
          className="text-lg text-gray-600 hover:text-gray-800"
        >
          Skip for now - I'll add the schedule later
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'details':
        return renderProjectDetailsStep();
      case 'documents':
        return renderDocumentsStep();
      case 'schedule':
        return renderScheduleStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'details':
        return projectForm.name && projectForm.location && projectForm.projectManager;
      case 'documents':
        return true; // Documents are optional
      case 'schedule':
        return true;
      default:
        return false;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'details':
        return isCreatingProject ? 'Creating Project...' : 'Create Project & Continue';
      case 'documents':
        return uploadingDocs ? 'Uploading...' : documents.length > 0 ? 'Upload Documents & Continue' : 'Continue';
      case 'schedule':
        return 'Choose Option Above';
      default:
        return 'Next';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/project-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-4xl font-bold text-center mb-2">Project Setup</h1>
          <p className="text-xl text-center text-muted-foreground">
            Let's get your new project up and running in just a few steps
          </p>
        </div>

        {renderStepIndicator()}
        {renderCurrentStep()}

        {/* Navigation */}
        {currentStep !== 'schedule' && (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="flex justify-between items-center">
              <div>
                {currentStep !== 'details' && (
                  <Button variant="outline" onClick={handleBack} size="lg">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {(currentStep === 'documents') && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    size="lg"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Skip This Step
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isCreatingProject || uploadingDocs}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {getNextButtonText()}
                  {(currentStep as OnboardingStep) !== 'schedule' && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}