"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import { useUploadPayrollMutation, useBulkExtractPayrollMutation, ProjectContractor } from '@/lib/features/certified-payroll/certifiedPayrollApi';

interface BulkAIUploadWizardProps {
  contractors: ProjectContractor[];
  dateRange: { startDate: string; endDate: string };
  onBack: () => void;
  onCompleted: (extractedData: any[]) => void;
}

type BulkUploadStep = 'upload' | 'extract' | 'complete';

export default function BulkAIUploadWizard({ contractors, dateRange, onBack, onCompleted }: BulkAIUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState<BulkUploadStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadPayroll, { isLoading: isUploading }] = useUploadPayrollMutation();
  const [bulkExtractPayroll, { isLoading: isExtracting }] = useBulkExtractPayrollMutation();

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setExtractionError(null); // Clear any previous errors
      const result = await uploadPayroll({ file: selectedFile }).unwrap();
      if (result.success) {
        setUploadedFileUrl(result.fileUrl);
        setCurrentStep('extract');
        
        // Automatically start extraction like the single contractor version
        await handleExtract(result.fileUrl);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.data?.error || 'Failed to upload file. Please try again.');
    }
  };

  const handleExtract = async (fileUrlToExtract: string = uploadedFileUrl) => {
    if (!fileUrlToExtract) return;

    try {
      setExtractionError(null); // Clear any previous errors
      const result = await bulkExtractPayroll({
        fileUrl: fileUrlToExtract,
        contractors: contractors.map(c => ({ id: c.id, name: c.name }))
      }).unwrap();
      
      if (result.success) {
        // Skip the review step and go straight to completion
        onCompleted(result.extractedData);
      }
    } catch (error: any) {
      console.error('Extraction failed:', error);
      
      // Set error state instead of showing alert
      setExtractionError(error.data?.error || 'Failed to extract payroll data. The AI response could not be parsed.');
      // Stay on extract step to show error and retry button
    }
  };

  const handleComplete = () => {
    if (extractedData?.extractedData) {
      onCompleted(extractedData.extractedData);
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
              Back to Payroll Details
            </Button>
            
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Bulk Upload Payroll Documents
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Multiple Workmen ({contractors.length}) | Pay Period: {formatDateRange()}
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'upload' ? 'text-blue-600' : 
              currentStep === 'extract' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'upload' ? 'bg-blue-100 border-2 border-blue-600' :
                currentStep === 'extract' || currentStep === 'complete' ? 'bg-green-100 border-2 border-green-600' :
                'bg-gray-100 border-2 border-gray-300'
              }`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="font-medium">Upload Document</span>
            </div>

            <div className={`w-16 h-px ${
              currentStep === 'extract' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>

            <div className={`flex items-center space-x-2 ${
              currentStep === 'extract' ? 'text-blue-600' : 
              currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'extract' ? 'bg-blue-100 border-2 border-blue-600' :
                currentStep === 'complete' ? 'bg-green-100 border-2 border-green-600' :
                'bg-gray-100 border-2 border-gray-300'
              }`}>
                <span className="text-sm font-medium">2</span>
              </div>
              <span className="font-medium">Extract Data</span>
            </div>

            <div className={`w-16 h-px ${
              currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>

            <div className={`flex items-center space-x-2 ${
              currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'complete' ? 'bg-green-100 border-2 border-green-600' :
                'bg-gray-100 border-2 border-gray-300'
              }`}>
                <span className="text-sm font-medium">3</span>
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>

          <Card>
            <CardContent className="p-8">
              {currentStep === 'upload' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Upload Payroll Document</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Upload a PDF, Excel file, or image containing payroll information for multiple workmen to extract the data automatically.
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
                        {selectedFile ? selectedFile.name : 'Drop your payroll document here or click to browse'}
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, Excel, and image files (JPEG, PNG, WebP), up to 50MB
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
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

                  {selectedFile && (
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="bg-black hover:bg-gray-800 text-white"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Upload & Continue'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'extract' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Extracting Payroll Data</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      AI is analyzing your document and extracting payroll information for each workman automatically.
                    </p>
                  </div>

                  {!extractionError ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <div>
                          <p className="font-medium text-blue-900 dark:text-blue-100">Processing with AI...</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Extracting data for {contractors.length} workmen
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-red-900 dark:text-red-100">AI Processing Failed</p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {extractionError}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleExtract()}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'complete' && extractedData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Extraction Complete!</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      AI has successfully extracted payroll data. Review the results below.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {extractedData.totalWorkersFound}
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">Workers Found</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {extractedData.matchingSummary.highConfidence}
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">High Confidence Matches</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {extractedData.matchingSummary.lowConfidence}
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">Needs Review</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border rounded-lg">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">Extracted Workers Data</h4>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {extractedData.extractedData.map((worker: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{worker.workerName}</p>
                              <p className="text-sm text-gray-600">→ {worker.matchedContractor}</p>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            worker.confidence === 'high'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {worker.confidence === 'high' ? 'High Confidence' : 'Needs Review'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleComplete}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Use Extracted Data
                    </Button>
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