"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useBulkCreateContractorsMutation } from "@/lib/features/contractors/contractorsApi";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, X, Check, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";

interface ContractorRow {
  firstName: string;
  lastName: string;
  email: string;
  rate?: string;
  companyName?: string;
  _fileName?: string;
}

interface ContractorBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContractorBulkUploadModal({ 
  isOpen, 
  onClose
}: ContractorBulkUploadModalProps) {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<ContractorRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  
  const [bulkCreateContractors, { 
    isLoading: isUploading, 
    isSuccess, 
    isError, 
    error,
    data: uploadResult,
    reset 
  }] = useBulkCreateContractorsMutation();

  const csvSchema = [
    { field: 'firstName', label: 'First Name', required: true, example: 'John' },
    { field: 'lastName', label: 'Last Name', required: true, example: 'Doe' },
    { field: 'email', label: 'Email', required: true, example: 'john.doe@example.com' },
    { field: 'rate', label: 'Hourly Rate', required: false, example: '25.00' },
    { field: 'companyName', label: 'Company/Subcontractor', required: false, example: 'ABC Construction' },
  ];

  const downloadTemplate = () => {
    const headers = csvSchema.map(field => field.label).join(',');
    const example = csvSchema.map(field => field.example).join(',');
    const csvContent = `${headers}\n${example}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contractors-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): ContractorRow[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: ContractorRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Partial<ContractorRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'first name':
            row.firstName = value;
            break;
          case 'last name':
            row.lastName = value;
            break;
          case 'email':
            row.email = value;
            break;
          case 'hourly rate':
          case 'rate':
            row.rate = value;
            break;
          case 'company/subcontractor':
          case 'company':
          case 'companyname':
            row.companyName = value;
            break;
        }
      });

      if (row.firstName || row.lastName || row.email) {
        rows.push(row as ContractorRow);
      }
    }

    return rows;
  };

  const validateContractors = (contractors: ContractorRow[]): string[] => {
    const errors: string[] = [];
    const emailSet = new Set<string>();

    contractors.forEach((contractor, index) => {
      const rowNum = index + 1;

      // Check required fields
      if (!contractor.firstName?.trim()) {
        errors.push(`Row ${rowNum}: First Name is required`);
      }
      if (!contractor.lastName?.trim()) {
        errors.push(`Row ${rowNum}: Last Name is required`);
      }
      if (!contractor.email?.trim()) {
        errors.push(`Row ${rowNum}: Email is required`);
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contractor.email)) {
          errors.push(`Row ${rowNum}: Invalid email format`);
        }
        
        // Check for duplicate emails in the CSV
        const email = contractor.email.toLowerCase();
        if (emailSet.has(email)) {
          errors.push(`Row ${rowNum}: Duplicate email address in CSV`);
        } else {
          emailSet.add(email);
        }
      }

      // Validate rate if provided
      if (contractor.rate && contractor.rate.trim()) {
        const rateValue = parseFloat(contractor.rate);
        if (isNaN(rateValue) || rateValue < 0 || rateValue > 9999.99) {
          errors.push(`Row ${rowNum}: Rate must be a valid number between 0 and 9999.99`);
        }
      }
    });

    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newErrors: string[] = [];
    const allContractors: ContractorRow[] = [];
    let processedFiles = 0;

    Array.from(files).forEach((file, fileIndex) => {
      if (!file.name.endsWith('.csv')) {
        newErrors.push(`File "${file.name}": Please upload only CSV files`);
        processedFiles++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const contractors = parseCSV(csvText);
          
          // Add file name to contractors for tracking
          const contractorsWithFile = contractors.map(contractor => ({
            ...contractor,
            _fileName: file.name
          }));
          
          allContractors.push(...contractorsWithFile);
          setUploadedFiles(prev => new Set([...prev, file.name]));
        } catch (error) {
          newErrors.push(`File "${file.name}": ${error instanceof Error ? error.message : 'Error parsing CSV file'}`);
        }

        processedFiles++;
        
        // When all files are processed
        if (processedFiles === files.length) {
          if (allContractors.length > 0) {
            const validationErrors = validateContractors(allContractors);
            const allErrors = [...newErrors, ...validationErrors];
            
            setErrors(allErrors);
            setCsvData(prev => [...prev, ...allContractors]);
          } else {
            setErrors(newErrors.length > 0 ? newErrors : ['No valid contractor data found in uploaded files']);
          }
        }
      };

      reader.readAsText(file);
    });
  };

  // Auto close modal after successful upload
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        handleClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleUpload = async () => {
    if (csvData.length === 0) return;
    
    try {
      // Remove _fileName property before sending to API
      const contractorsForUpload = csvData.map(({ _fileName, ...contractor }) => contractor);
      await bulkCreateContractors({ contractors: contractorsForUpload }).unwrap();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const removeFile = (fileName: string) => {
    setCsvData(prev => prev.filter(contractor => contractor._fileName !== fileName));
    setUploadedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    
    // Re-validate after removing file
    const remainingContractors = csvData.filter(contractor => contractor._fileName !== fileName);
    if (remainingContractors.length > 0) {
      const validationErrors = validateContractors(remainingContractors);
      setErrors(validationErrors);
    } else {
      setErrors([]);
    }
  };

  const handleClose = () => {
    setCsvData([]);
    setErrors([]);
    setStep('upload');
    setUploadedFiles(new Set());
    reset(); // Reset RTK Query state
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Label className="text-base font-medium">Upload CSV File</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadTemplate}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>Download Template</span>
          </Button>
        </div>
        
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                Click to upload CSV files
              </p>
              <p className="text-sm text-muted-foreground">
                You can select multiple CSV files at once
              </p>
              <p className="text-sm text-muted-foreground">
                Required: First Name, Last Name, Email
              </p>
              <p className="text-xs text-muted-foreground">
                Optional: Rate, Company/Subcontractor
              </p>
            </div>
          </div>
        </div>

        {csvData.length > 0 && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-green-700 dark:text-green-300 mb-3">
                <Check className="h-5 w-5" />
                <span className="font-medium">
                  {csvData.length} contractor{csvData.length !== 1 ? 's' : ''} loaded and ready
                </span>
              </div>
              {uploadedFiles.size > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300">
                    Uploaded Files:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(uploadedFiles).map((fileName) => (
                      <div key={fileName} className="flex items-center space-x-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg px-3 py-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                          {fileName}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileName)}
                          className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {errors.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-700 dark:text-red-300 flex items-center space-x-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Validation Errors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-32 overflow-y-auto">
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Preview Data
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {csvData.length} contractor{csvData.length !== 1 ? 's' : ''} ready to upload
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setStep('upload')}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <X className="h-4 w-4" />
          <span>Upload Different File</span>
        </Button>
      </div>
      
      <Card className="border-gray-200 dark:border-gray-700">
        <div className="max-h-96 overflow-auto">
          <div className="block sm:hidden">
            {/* Mobile Card View */}
            <div className="space-y-3 p-4">
              {csvData.map((contractor, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {contractor._fileName && (
                      <div className="col-span-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {contractor._fileName}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Name:</span>
                      <p className="text-gray-900 dark:text-gray-100">{contractor.firstName} {contractor.lastName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Rate:</span>
                      <p className="text-gray-900 dark:text-gray-100">
                        {contractor.rate ? `$${contractor.rate}` : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-500 dark:text-gray-400">Email:</span>
                      <p className="text-gray-900 dark:text-gray-100 text-xs font-mono break-all">{contractor.email}</p>
                    </div>
                    {contractor.companyName && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Company:</span>
                        <p className="text-gray-900 dark:text-gray-100">{contractor.companyName}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:block">
            {/* Desktop Table View */}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    First Name
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    Last Name
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    Email
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    Rate
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    Company
                  </th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((contractor, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 text-gray-900 dark:text-gray-100">{contractor.firstName}</td>
                    <td className="p-4 text-gray-900 dark:text-gray-100">{contractor.lastName}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-mono text-xs">{contractor.email}</td>
                    <td className="p-4">
                      {contractor.rate ? (
                        <span className="text-green-700 dark:text-green-300 font-medium">${contractor.rate}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {contractor.companyName ? (
                        <span className="text-gray-700 dark:text-gray-300">{contractor.companyName}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderLoadingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Uploading Contractors
        </h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we create {csvData.length} contractor{csvData.length !== 1 ? 's' : ''}...
        </p>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
          Upload Successful!
        </h3>
        <p className="text-sm text-muted-foreground">
          {uploadResult?.message || `Successfully created ${csvData.length} contractors`}
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          This modal will close automatically...
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => {
    const errorMessage = error && 'data' in error && error.data 
      ? (error.data as any)?.error || 'Upload failed'
      : 'Upload failed';

    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
            Upload Failed
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  };

  const getCurrentStep = () => {
    if (isUploading) return 'uploading';
    if (isSuccess) return 'success';
    if (isError) return 'error';
    return step;
  };

  const renderCurrentStep = () => {
    const currentStep = getCurrentStep();
    
    switch (currentStep) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'uploading':
        return renderLoadingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderUploadStep();
    }
  };

  const getModalTitle = () => {
    const currentStep = getCurrentStep();
    
    switch (currentStep) {
      case 'uploading':
        return 'Uploading Contractors';
      case 'success':
        return 'Upload Complete';
      case 'error':
        return 'Upload Failed';
      default:
        return 'Bulk Upload Contractors';
    }
  };

  const getModalDescription = () => {
    const currentStep = getCurrentStep();
    
    switch (currentStep) {
      case 'uploading':
        return 'Please wait while we process your contractors...';
      case 'success':
        return 'Your contractors have been successfully created.';
      case 'error':
        return 'There was an error uploading your contractors.';
      default:
        return 'Upload multiple contractors at once using a CSV file. Follow the schema requirements below.';
    }
  };

  const shouldShowFooter = () => {
    const currentStep = getCurrentStep();
    return !['uploading', 'success'].includes(currentStep);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={!isUploading ? handleClose : undefined}>
      <AlertDialogContent className="max-w-5xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
        <AlertDialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isUploading}
            className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
          <AlertDialogTitle className="text-lg sm:text-xl pr-8">{getModalTitle()}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            {getModalDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 sm:py-6">
          {renderCurrentStep()}
        </div>

        {shouldShowFooter() && (
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel 
              onClick={handleClose} 
              disabled={isUploading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </AlertDialogCancel>
            
            {step === 'upload' && csvData.length > 0 && errors.length === 0 && (
              <Button 
                onClick={() => setStep('preview')} 
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Check className="h-4 w-4" />
                <span>Next: Preview {csvData.length} Contractor{csvData.length !== 1 ? 's' : ''}</span>
              </Button>
            )}
            
            {step === 'preview' && (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || csvData.length === 0}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload {csvData.length} Contractor{csvData.length !== 1 ? 's' : ''}</span>
              </Button>
            )}
            
            {getCurrentStep() === 'error' && (
              <Button 
                onClick={() => setStep('upload')} 
                className="flex items-center justify-center space-x-2 w-full sm:w-auto order-1 sm:order-2"
              >
                <Upload className="h-4 w-4" />
                <span>Back to Upload</span>
              </Button>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}