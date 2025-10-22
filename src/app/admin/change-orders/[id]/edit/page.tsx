"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { 
  useGetChangeOrderQuery,
  useUpdateChangeOrderMutation, 
  useUploadChangeOrderDocumentMutation, 
  useCreateChangeOrderDocumentMutation,
  useGetChangeOrderDocumentsQuery 
} from '@/lib/features/change-orders/changeOrdersApi';
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

export default function EditChangeOrderPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const changeOrderId = params.id as string;
  
  // Check for tab parameter in URL
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const backTab = searchParams.get('tab');
  
  const { auth } = useAppSelector((state) => state);
  const [updateChangeOrder, { isLoading: isSubmitting }] = useUpdateChangeOrderMutation();
  const [uploadDocument] = useUploadChangeOrderDocumentMutation();
  const [createDocument] = useCreateChangeOrderDocumentMutation();
  const { showToast } = useToast();
  
  // Fetch existing change order
  const { data: changeOrderData, isLoading: isLoadingChangeOrder } = useGetChangeOrderQuery(changeOrderId);
  const { data: documentsData } = useGetChangeOrderDocumentsQuery({ 
    changeOrderId,
    page: 1,
    pageSize: 100 
  });

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
    requestedBy: '',
    notesOrJustification: '',
    toBeApprovedBy: '',
    toBeApprovedByUserIds: [],
    keyStakeholder: '',
    status: 'Pending',
    approverSignature: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load change order data into form
  useEffect(() => {
    if (changeOrderData?.changeOrder) {
      const co = changeOrderData.changeOrder;
      setFormData({
        title: co.title || '',
        description: co.description || '',
        changeType: co.changeType || '',
        originalContractAmount: co.originalContractAmount?.toString() || '',
        newAmount: co.newAmount?.toString() || '',
        costDifference: co.costDifference?.toString() || '',
        addedDays: co.addedDays?.toString() || '0',
        originalEndDate: co.originalEndDate || '',
        revisedEndDate: co.revisedEndDate || '',
        requestedBy: co.requestedBy || '',
        notesOrJustification: co.notesOrJustification || '',
        toBeApprovedBy: co.toBeApprovedBy || '',
        toBeApprovedByUserIds: co.toBeApprovedByUserIds || [],
        keyStakeholder: co.keyStakeholder || '',
        status: co.status || 'Pending',
        approverSignature: co.approverSignature || '', // Load existing signature URL
      });
    }
  }, [changeOrderData]);

  // Load existing documents
  useEffect(() => {
    if (documentsData?.documents) {
      setExistingDocuments(documentsData.documents);
    }
  }, [documentsData]);

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
    const projectId = changeOrderData?.changeOrder?.projectId;
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
    if (!validateForm()) return;

    try {
      // Update change order
      const changeOrderUpdateData = {
        id: changeOrderId,
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
        keyStakeholder: formData.keyStakeholder || undefined,
        status: formData.status,
        approverSignature: formData.approverSignature || undefined,
      };

      const result = await updateChangeOrder(changeOrderUpdateData).unwrap();
      
      if (result.success && result.changeOrder) {
        // Associate any new uploaded documents with the change order
        const projectId = result.changeOrder.projectId;
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
        
        showToast('Change order updated successfully!', 'success');
        router.push(`/admin/project-dashboard/${projectId}${backTab ? `?tab=${backTab}` : '?tab=change-orders'}`);
      }
    } catch (error: any) {
      console.error('Change order update error:', error);
      showToast(error?.data?.error || 'Failed to update change order', 'error');
    }
  };

  if (isLoadingChangeOrder) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const projectId = changeOrderData?.changeOrder?.projectId;

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
            Edit Change Order
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
                  <Label htmlFor="fileUpload">Upload Additional Files</Label>
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
                    {(uploadedFiles.length > 0 || existingDocuments.length > 0) && (
                      <span className="text-sm text-gray-600">
                        {existingDocuments.length + uploadedFiles.length} file(s) total
                      </span>
                    )}
                  </div>
                  
                  {/* Existing Documents */}
                  {existingDocuments.length > 0 && (
                    <div className="mt-2">
                      <Label className="text-sm text-gray-600">Existing Documents</Label>
                      <div className="space-y-2 mt-1">
                        {existingDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>{doc.name}</span>
                              <span className="text-gray-500">({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2">
                      <Label className="text-sm text-gray-600">Newly Uploaded Files</Label>
                      <div className="space-y-2 mt-1">
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
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Approval Section */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Approval Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="keyStakeholder">Key Stakeholder</Label>
                  <Input
                    id="keyStakeholder"
                    value={formData.keyStakeholder}
                    onChange={(e) => updateFormData({ keyStakeholder: e.target.value })}
                    placeholder="Key stakeholder name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => updateFormData({ status: value as any })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <Label>Approver Signature</Label>
                  <div className="mt-2">
                    <SignatureButton
                      signature={formData.approverSignature}
                      onSignatureChange={(signature) => updateFormData({ approverSignature: signature })}
                      signerName={formData.toBeApprovedBy || 'Approver'}
                    />
                  </div>
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
              {isSubmitting ? 'Updating...' : 'Update Change Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}