"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

interface ProjectOnboardingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export default function ProjectOnboardingModal({ 
  isOpen, 
  onOpenChange 
}: ProjectOnboardingModalProps) {
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
        // Finish onboarding
        onOpenChange(false);
        if (createdProjectId) {
          router.push(`/admin/project-dashboard/${createdProjectId}`);
        }
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
        onOpenChange(false);
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
    onOpenChange(false);
    if (createdProjectId) {
      if (choice === 'manual') {
        router.push(`/admin/project-tasks/manual/${createdProjectId}`);
      } else {
        router.push(`/admin/project-tasks/upload/${createdProjectId}`);
      }
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {(['details', 'documents', 'schedule'] as OnboardingStep[]).map((step, index) => {
          const Icon = getStepIcon(step);
          const isCompleted = completedSteps.includes(step);
          const isCurrent = currentStep === step;
          
          return (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCompleted 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : isCurrent 
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div className="ml-2 hidden sm:block">
                <div className={`text-sm font-medium ${
                  isCompleted || isCurrent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                }`}>
                  {getStepTitle(step)}
                </div>
              </div>
              {index < 2 && (
                <div className={`w-8 h-0.5 mx-4 ${
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Building className="w-12 h-12 mx-auto text-blue-600" />
        <h2 className="text-2xl font-bold">Project Details</h2>
        <p className="text-muted-foreground">
          Let's start by setting up your project basic information
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Project Name
          </Label>
          <Input
            id="name"
            value={projectForm.name}
            onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter project name"
            className={formErrors.name ? "border-red-500" : ""}
          />
          {formErrors.name && (
            <p className="text-sm text-red-500">{formErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            id="location"
            value={projectForm.location}
            onChange={(e) => setProjectForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Enter project location"
            className={formErrors.location ? "border-red-500" : ""}
          />
          {formErrors.location && (
            <p className="text-sm text-red-500">{formErrors.location}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectManager" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Project Manager
          </Label>
          <Select 
            value={projectForm.projectManager} 
            onValueChange={(value) => setProjectForm(prev => ({ ...prev, projectManager: value }))}
          >
            <SelectTrigger className={formErrors.projectManager ? "border-red-500" : ""}>
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
          <Label htmlFor="projectCost" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
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
            className={formErrors.projectCost ? "border-red-500" : ""}
          />
          {formErrors.projectCost && (
            <p className="text-sm text-red-500">{formErrors.projectCost}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <FileText className="w-12 h-12 mx-auto text-green-600" />
        <h2 className="text-2xl font-bold">Project Documents</h2>
        <p className="text-muted-foreground">
          Upload important project documents (optional)
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
        <p className="text-sm text-gray-500">Support for multiple files, up to 50MB each</p>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Files to Upload ({documents.length})</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocuments([])}
            >
              Clear All
            </Button>
          </div>
          <div className="space-y-3 max-h-60 overflow-auto">
            {documents.map((doc, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-1" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{doc.file.name}</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Select
                        value={doc.category}
                        onValueChange={(value) => updateDocumentMeta(index, 'category', value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={doc.description}
                        onChange={(e) => updateDocumentMeta(index, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Calendar className="w-12 h-12 mx-auto text-purple-600" />
        <h2 className="text-2xl font-bold">Project Schedule</h2>
        <p className="text-muted-foreground">
          Choose how you'd like to set up your project timeline
        </p>
      </div>

      {/* Choice Cards */}
      <div className="flex items-stretch gap-4 sm:gap-6">
        {/* Manual Entry Card */}
        <div className="flex-1">
          <Card
            className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-colors h-full"
            onClick={() => handleScheduleChoice('manual')}
          >
            <CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <Plus className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h3 className="font-semibold mb-2 text-lg">Add Manually</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create tasks one by one with full control over details
              </p>
              <Button variant="outline" size="sm" className="mt-auto">
                <Plus className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* OR Divider */}
        <div className="text-muted-foreground flex items-center justify-center py-4 sm:py-0">
          <span className="bg-background px-4 py-2 rounded-full border text-sm">or</span>
        </div>

        {/* Upload Card */}
        <div className="flex-1">
          <Card
            className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 cursor-pointer transition-colors h-full"
            onClick={() => handleScheduleChoice('upload')}
          >
            <CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <Brain className="w-12 h-12 mx-auto text-green-600 mb-4" />
              <h3 className="font-semibold mb-2 text-lg">AI Extraction</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your schedule file and let AI extract tasks
              </p>
              <Button variant="outline" size="sm" className="mt-auto">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center">
        <Button 
          variant="link" 
          onClick={() => {
            onOpenChange(false);
            if (createdProjectId) {
              router.push(`/admin/project-dashboard/${createdProjectId}`);
            }
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          Skip for now - I'll add tasks later
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
        return isCreatingProject ? 'Creating Project...' : 'Create Project';
      case 'documents':
        return uploadingDocs ? 'Uploading...' : documents.length > 0 ? 'Upload & Continue' : 'Continue';
      case 'schedule':
        return 'Choose Option';
      default:
        return 'Next';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="p-8 space-y-8">
          {renderStepIndicator()}
          {renderCurrentStep()}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div>
              {currentStep !== 'details' && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {(currentStep === 'documents' || currentStep === 'schedule') && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Skip
                </Button>
              )}
              
              {currentStep !== 'schedule' && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isCreatingProject || uploadingDocs}
                  className="min-w-[140px]"
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  {getNextButtonText()}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}