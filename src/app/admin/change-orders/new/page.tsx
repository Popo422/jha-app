"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/lib/hooks';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { ArrowLeft, Upload, X, FileText, DollarSign, Calendar, User } from "lucide-react";
import Link from "next/link";
import { useCreateChangeOrderMutation, useUploadChangeOrderDocumentMutation, useCreateChangeOrderDocumentMutation } from '@/lib/features/change-orders/changeOrdersApi';
import SupervisorSelect from '@/components/SupervisorSelect';
import { useToast } from '@/components/ui/toast';
import SignatureButton from '@/components/SignatureButton';

interface ChangeOrderFormData {
  title: string;
  description: string;
  changeType: 'Scope' | 'Time' | 'Cost' | 'All' | '';
  
  // Cost Impact
  originalContractAmount: string;
  newAmount: string;
  costDifference: string;
  
  // Schedule Impact
  addedDays: string;
  originalEndDate: string;
  revisedEndDate: string;
  
  // Request Information
  requestedBy: string;
  notesOrJustification: string;
  
  // Approval
  toBeApprovedBy: string;
  toBeApprovedByUserIds: string[];
  keyStakeholder: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  
  // Signature
  approverSignature: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  blobKey: string;
  category: string;
  description: string;
  fileType: string;
}

export default function NewChangeOrderPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const backTab = searchParams.get('tab');
  
  const { auth } = useAppSelector((state) => state);
  const [createChangeOrder, { isLoading: isSubmitting }] = useCreateChangeOrderMutation();
  const [uploadDocument] = useUploadChangeOrderDocumentMutation();
  const [createDocument] = useCreateChangeOrderDocumentMutation();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ChangeOrderFormData>({
    title: '',
    description: '',
    changeType: '',
    originalContractAmount: '',
    newAmount: '',
    costDifference: '',
    addedDays: '0',
    originalEndDate: '',
    revisedEndDate: '',
    requestedBy: auth.admin?.name || '',
    notesOrJustification: '',
    toBeApprovedBy: '',
    toBeApprovedByUserIds: [],
    keyStakeholder: '',
    status: 'Pending',
    approverSignature: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Redirect if no projectId
  useEffect(() => {
    if (!projectId) {
      router.push('/admin/project-dashboard');
    }
  }, [projectId, router]);

  // Calculate cost difference when amounts change
  useEffect(() => {
    const original = parseFloat(formData.originalContractAmount) || 0;
    const newAmount = parseFloat(formData.newAmount) || 0;
    const difference = newAmount - original;
    
    if (original > 0 && newAmount > 0) {
      setFormData(prev => ({
        ...prev,
        costDifference: difference.toString()
      }));
    }
  }, [formData.originalContractAmount, formData.newAmount]);

  const updateFormData = (updates: Partial<ChangeOrderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = async (files: FileList) => {
    if (!projectId) return;
    
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('category', 'Supporting Document');
        formData.append('description', `Supporting document for change order`);

        const uploadResult = await uploadDocument(formData).unwrap();
        
        if (uploadResult.success) {
          const newFile: UploadedFile = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: uploadResult.fileData.name,
            size: uploadResult.fileData.fileSize,
            url: uploadResult.fileData.url,
            blobKey: uploadResult.fileData.blobKey,
            category: uploadResult.fileData.category,
            description: uploadResult.fileData.description,
            fileType: uploadResult.fileData.fileType,
          };
          
          setUploadedFiles(prev => [...prev, newFile]);
        }
      }
      showToast('Files uploaded successfully', 'success');
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to upload files', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return false;
    }
    if (!formData.changeType) {
      showToast('Change type is required', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !projectId) return;

    try {
      // Create change order
      const changeOrderData = {
        projectId,
        title: formData.title,
        description: formData.description || undefined,
        changeType: formData.changeType as 'Scope' | 'Time' | 'Cost' | 'All',
        originalContractAmount: formData.originalContractAmount ? parseFloat(formData.originalContractAmount) : undefined,
        newAmount: formData.newAmount ? parseFloat(formData.newAmount) : undefined,
        costDifference: formData.costDifference ? parseFloat(formData.costDifference) : undefined,
        addedDays: formData.addedDays ? parseInt(formData.addedDays) : 0,
        originalEndDate: formData.originalEndDate || undefined,
        revisedEndDate: formData.revisedEndDate || undefined,
        requestedBy: formData.requestedBy,
        notesOrJustification: formData.notesOrJustification || undefined,
        toBeApprovedBy: formData.toBeApprovedBy || undefined,
        toBeApprovedByUserIds: formData.toBeApprovedByUserIds,
        keyStakeholder: undefined,
        status: 'Pending',
        approverSignature: undefined,
      };

      const result = await createChangeOrder(changeOrderData).unwrap();
      
      if (result.success && result.changeOrder) {
        // Associate uploaded documents with the change order
        for (const file of uploadedFiles) {
          await createDocument({
            changeOrderId: result.changeOrder.id,
            projectId: projectId,
            name: file.name,
            description: file.description,
            category: file.category,
            fileType: file.fileType,
            fileSize: file.size,
            url: file.url,
            blobKey: file.blobKey
          });
        }
        
        showToast('Change order created successfully!', 'success');
        router.push(`/admin/project-dashboard/${projectId}${backTab ? `?tab=${backTab}` : '?tab=change-orders'}`);
      }
    } catch (error: any) {
      console.error('Change order creation error:', error);
      showToast(error?.data?.error || 'Failed to create change order', 'error');
    }
  };

  if (!projectId) {
    return null;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link
                href={`/admin/project-dashboard/${projectId}${backTab ? `?tab=${backTab}` : '?tab=change-orders'}`}
                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Change Orders
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                New Change Order
              </h1>
            </div>

            <div className="space-y-6">
              {/* Main Change Order Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Change Order Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => updateFormData({ title: e.target.value })}
                        placeholder="Enter change order title"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description of Change</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData({ description: e.target.value })}
                        placeholder="Describe the change in detail"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="changeType">Change Type *</Label>
                      <Select value={formData.changeType} onValueChange={(value) => updateFormData({ changeType: value as any })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select change type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scope">Scope</SelectItem>
                          <SelectItem value="Time">Time</SelectItem>
                          <SelectItem value="Cost">Cost</SelectItem>
                          <SelectItem value="All">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="addedDays">Schedule Impact (Days)</Label>
                      <Input
                        id="addedDays"
                        type="number"
                        value={formData.addedDays}
                        onChange={(e) => updateFormData({ addedDays: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="costDifference">Cost Impact ($)</Label>
                      <Input
                        id="costDifference"
                        type="number"
                        step="0.01"
                        value={formData.costDifference}
                        onChange={(e) => updateFormData({ costDifference: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="requestedBy">Requested By</Label>
                      <Input
                        id="requestedBy"
                        value={formData.requestedBy}
                        onChange={(e) => updateFormData({ requestedBy: e.target.value })}
                        placeholder="Project manager name"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <SupervisorSelect
                        label="To be Approved By"
                        value={formData.toBeApprovedBy}
                        onChange={(value) => updateFormData({ toBeApprovedBy: value })}
                        authType="admin"
                        placeholder="Select admin approver..."
                        required={false}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="justification">Notes or Justification</Label>
                      <Textarea
                        id="justification"
                        value={formData.notesOrJustification}
                        onChange={(e) => updateFormData({ notesOrJustification: e.target.value })}
                        placeholder="Provide justification for this change"
                        rows={3}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="fileUpload">Upload Files</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('fileUpload')?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {isUploading ? 'Uploading...' : 'Upload Files'}
                        </Button>
                        <Input
                          id="fileUpload"
                          type="file"
                          multiple
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                          className="hidden"
                          disabled={isUploading}
                        />
                        {uploadedFiles.length > 0 && (
                          <span className="text-sm text-gray-600">
                            {uploadedFiles.length} file(s) uploaded
                          </span>
                        )}
                      </div>
                      
                      {uploadedFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 border rounded text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>{file.name}</span>
                                <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/project-dashboard/${projectId}${backTab ? `?tab=${backTab}` : '?tab=change-orders'}`)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create Change Order'}
                </Button>
              </div>
        </div>
      </div>
    </div>
  );
}