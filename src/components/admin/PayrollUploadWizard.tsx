"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileText, Link, Loader2 } from 'lucide-react';
import { useUploadPayrollMutation, useExtractPayrollMutation } from '@/lib/features/certified-payroll/certifiedPayrollApi';

interface PayrollUploadWizardProps {
  contractorName: string;
  contractorId: string;
  dateRange: { startDate: string; endDate: string };
  onBack: () => void;
  onExtracted: (extractedData: any) => void;
}

type UploadStep = 'upload' | 'extract' | 'complete';

export default function PayrollUploadWizard({ 
  contractorName,
  contractorId,
  dateRange,
  onBack,
  onExtracted
}: PayrollUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadPayroll, { isLoading: isUploading }] = useUploadPayrollMutation();
  const [extractPayroll, { isLoading: isExtracting }] = useExtractPayrollMutation();

  const formatDateRange = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        setFileUrl('');
      } else {
        alert('Please select a PDF or image file (JPEG, PNG, WebP)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        setFileUrl('');
      } else {
        alert('Please select a PDF or image file (JPEG, PNG, WebP)');
      }
    }
  };

  const handleUpload = async () => {
    try {
      let result;
      
      if (selectedFile) {
        result = await uploadPayroll({ file: selectedFile }).unwrap();
      } else if (fileUrl) {
        result = await uploadPayroll({ url: fileUrl }).unwrap();
      } else {
        alert('Please select a file or enter a URL');
        return;
      }

      setUploadedFileUrl(result.fileUrl);
      setCurrentStep('extract');
      
      // Automatically start extraction
      await handleExtract(result.fileUrl);
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.data?.error || 'Upload failed. Please try again.');
    }
  };

  const handleExtract = async (fileUrlToExtract: string = uploadedFileUrl) => {
    try {
      const result = await extractPayroll({ 
        fileUrl: fileUrlToExtract,
        contractorName: contractorName 
      }).unwrap();
      
      if (result.success) {
        setCurrentStep('complete');
        onExtracted(result.extractedData);
      } else {
        alert('Failed to extract payroll data from the document');
      }
    } catch (error: any) {
      console.error('Extraction failed:', error);
      alert(error.data?.error || 'Failed to extract payroll data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payroll Options
            </Button>
            
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Upload Payroll Document
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Employee: {contractorName} | Pay Period: {formatDateRange()}
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2">Upload Document</span>
            </div>
            
            <div className="w-16 h-1 bg-gray-200">
              <div className={`h-full bg-blue-600 transition-all duration-300 ${
                currentStep !== 'upload' ? 'w-full' : 'w-0'
              }`} />
            </div>
            
            <div className={`flex items-center ${currentStep === 'extract' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'extract' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="ml-2">Extract Data</span>
            </div>
            
            <div className="w-16 h-1 bg-gray-200">
              <div className={`h-full bg-blue-600 transition-all duration-300 ${
                currentStep === 'complete' ? 'w-full' : 'w-0'
              }`} />
            </div>
            
            <div className={`flex items-center ${currentStep === 'complete' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className="ml-2">Review</span>
            </div>
          </div>

          <Card>
            <CardContent className="p-8">
              {currentStep === 'upload' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Upload Payroll Document</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Upload a PDF or image containing payroll information to extract the data automatically.
                    </p>
                  </div>

                  {/* File Drop Zone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {selectedFile ? selectedFile.name : 'Drop your PDF or image here or click to browse'}
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF and image files (JPEG, PNG, WebP), up to 50MB
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select File
                    </Button>
                  </div>

                  {/* URL Input Option */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                      <span className="text-sm text-gray-500">OR</span>
                      <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fileUrl">Enter File URL</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="fileUrl"
                            type="url"
                            placeholder="https://example.com/payroll-document.pdf"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button 
                      onClick={handleUpload}
                      disabled={!selectedFile && !fileUrl || isUploading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload & Extract Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 'extract' && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Extracting Payroll Data</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Our AI is analyzing your document and extracting payroll information...
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 'complete' && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Data Extracted Successfully</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Payroll data has been extracted from your document. You can now review and edit the information.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}