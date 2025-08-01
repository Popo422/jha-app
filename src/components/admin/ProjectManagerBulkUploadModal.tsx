"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, X, Check, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface ProjectManagerRow {
  name: string;
  email: string;
  _fileName?: string;
}

interface ProjectManagerBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (managers: ProjectManagerRow[]) => void;
}

export function ProjectManagerBulkUploadModal({ 
  isOpen, 
  onClose,
  onUploadSuccess
}: ProjectManagerBulkUploadModalProps) {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<ProjectManagerRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  const csvSchema = [
    { field: 'name', label: 'Manager Name', required: true, example: 'John Smith' },
    { field: 'email', label: 'Email', required: true, example: 'john.smith@example.com' },
  ];

  const downloadTemplate = (format: 'csv' | 'excel' = 'csv') => {
    if (format === 'csv') {
      const headers = csvSchema.map(field => field.label).join(',');
      const example = csvSchema.map(field => field.example).join(',');
      const csvContent = `${headers}\n${example}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-managers-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      // Create Excel template
      const headers = csvSchema.map(field => field.label);
      const example = csvSchema.map(field => field.example);
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Managers');
      
      // Generate buffer and download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-managers-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const parseCSV = (csvText: string): ProjectManagerRow[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: ProjectManagerRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Partial<ProjectManagerRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'manager name':
          case 'name':
            row.name = value;
            break;
          case 'email':
            row.email = value;
            break;
        }
      });

      if (row.name || row.email) {
        rows.push(row as ProjectManagerRow);
      }
    }

    return rows;
  };

  const parseExcel = (buffer: ArrayBuffer): ProjectManagerRow[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheetName = workbook.SheetNames[0];
    
    if (!worksheetName) {
      throw new Error('Excel file must contain at least one worksheet');
    }

    const worksheet = workbook.Sheets[worksheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }

    const headers = jsonData[0].map((h: any) => String(h || '').trim());
    const rows: ProjectManagerRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i] || [];
      const row: Partial<ProjectManagerRow> = {};

      headers.forEach((header, index) => {
        const value = String(values[index] || '').trim();
        switch (header.toLowerCase()) {
          case 'manager name':
          case 'name':
            row.name = value;
            break;
          case 'email':
            row.email = value;
            break;
        }
      });

      if (row.name || row.email) {
        rows.push(row as ProjectManagerRow);
      }
    }

    return rows;
  };

  const validateProjectManagers = (managers: ProjectManagerRow[]): string[] => {
    const errors: string[] = [];
    const emailSet = new Set<string>();

    managers.forEach((manager, index) => {
      const rowNum = index + 1;

      // Check required fields
      if (!manager.name?.trim()) {
        errors.push(`Row ${rowNum}: Manager Name is required`);
      }
      if (!manager.email?.trim()) {
        errors.push(`Row ${rowNum}: Email is required`);
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(manager.email)) {
          errors.push(`Row ${rowNum}: Invalid email format`);
        }
        
        // Check for duplicate emails in the CSV
        const email = manager.email.toLowerCase();
        if (emailSet.has(email)) {
          errors.push(`Row ${rowNum}: Duplicate email address in file`);
        } else {
          emailSet.add(email);
        }
      }
    });

    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newErrors: string[] = [];
    const allManagers: ProjectManagerRow[] = [];
    let processedFiles = 0;

    const isExcelFile = (fileName: string) => {
      return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    };

    const isCsvFile = (fileName: string) => {
      return fileName.endsWith('.csv');
    };

    Array.from(files).forEach((file, fileIndex) => {
      if (!isCsvFile(file.name) && !isExcelFile(file.name)) {
        newErrors.push(`File "${file.name}": Please upload only CSV or Excel files`);
        processedFiles++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let managers: ProjectManagerRow[] = [];
          
          if (isCsvFile(file.name)) {
            const csvText = e.target?.result as string;
            managers = parseCSV(csvText);
          } else if (isExcelFile(file.name)) {
            const buffer = e.target?.result as ArrayBuffer;
            managers = parseExcel(buffer);
          }
          
          // Add file name to managers for tracking
          const managersWithFile = managers.map(manager => ({
            ...manager,
            _fileName: file.name
          }));
          
          allManagers.push(...managersWithFile);
          setUploadedFiles(prev => new Set([...prev, file.name]));
        } catch (error) {
          newErrors.push(`File "${file.name}": ${error instanceof Error ? error.message : 'Error parsing file'}`);
        }

        processedFiles++;
        
        // When all files are processed
        if (processedFiles === files.length) {
          if (allManagers.length > 0) {
            const validationErrors = validateProjectManagers(allManagers);
            const allErrors = [...newErrors, ...validationErrors];
            
            setErrors(allErrors);
            setCsvData(prev => [...prev, ...allManagers]);
          } else {
            setErrors(newErrors.length > 0 ? newErrors : ['No valid project manager data found in uploaded files']);
          }
        }
      };

      if (isCsvFile(file.name)) {
        reader.readAsText(file);
      } else if (isExcelFile(file.name)) {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleUpload = async () => {
    if (csvData.length === 0) return;
    
    setIsUploading(true);
    try {
      // Remove _fileName property before calling onUploadSuccess
      const managersForUpload = csvData.map(({ _fileName, ...manager }) => manager);
      onUploadSuccess(managersForUpload);
      setStep('success');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileName: string) => {
    setCsvData(prev => prev.filter(manager => manager._fileName !== fileName));
    setUploadedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    
    // Re-validate after removing file
    const remainingManagers = csvData.filter(manager => manager._fileName !== fileName);
    if (remainingManagers.length > 0) {
      const validationErrors = validateProjectManagers(remainingManagers);
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
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Auto close modal after successful upload
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        handleClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Label className="text-base font-medium">Upload CSV or Excel File</Label>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('csv')}
              className="flex items-center justify-center space-x-2 flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span>CSV Template</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('excel')}
              className="flex items-center justify-center space-x-2 flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span>Excel Template</span>
            </Button>
          </div>
        </div>
        
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
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
                Click to upload CSV or Excel files
              </p>
              <p className="text-sm text-muted-foreground">
                You can select multiple files at once (.csv, .xlsx, .xls)
              </p>
              <p className="text-sm text-muted-foreground">
                Required: Manager Name, Email
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
                  {csvData.length} project manager{csvData.length !== 1 ? 's' : ''} loaded and ready
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
            {csvData.length} project manager{csvData.length !== 1 ? 's' : ''} ready to add
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
              {csvData.map((manager, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {manager._fileName && (
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs">
                          {manager._fileName}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Name:</span>
                      <p className="text-gray-900 dark:text-gray-100">{manager.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Email:</span>
                      <p className="text-gray-900 dark:text-gray-100 text-xs font-mono break-all">{manager.email}</p>
                    </div>
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
                    Manager Name
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((manager, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 text-gray-900 dark:text-gray-100">{manager.name}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-mono text-xs">{manager.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
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
          Successfully added {csvData.length} project managers
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          This modal will close automatically...
        </p>
      </div>
    </div>
  );

  const getCurrentStep = () => {
    if (isUploading) return 'uploading';
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
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Adding Project Managers
              </h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we add {csvData.length} project manager{csvData.length !== 1 ? 's' : ''}...
              </p>
            </div>
          </div>
        );
      case 'success':
        return renderSuccessStep();
      default:
        return renderUploadStep();
    }
  };

  const getModalTitle = () => {
    const currentStep = getCurrentStep();
    
    switch (currentStep) {
      case 'uploading':
        return 'Adding Project Managers';
      case 'success':
        return 'Upload Complete';
      default:
        return 'Bulk Upload Project Managers';
    }
  };

  const getModalDescription = () => {
    const currentStep = getCurrentStep();
    
    switch (currentStep) {
      case 'uploading':
        return 'Please wait while we process your project managers...';
      case 'success':
        return 'Your project managers have been successfully added.';
      default:
        return 'Upload multiple project managers at once using CSV or Excel files. Follow the schema requirements below.';
    }
  };

  const shouldShowFooter = () => {
    const currentStep = getCurrentStep();
    return !['uploading', 'success'].includes(currentStep);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={!isUploading ? handleClose : undefined}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
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
                <span>Next: Preview {csvData.length} Manager{csvData.length !== 1 ? 's' : ''}</span>
              </Button>
            )}
            
            {step === 'preview' && (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || csvData.length === 0}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Upload className="h-4 w-4" />
                <span>Add {csvData.length} Manager{csvData.length !== 1 ? 's' : ''}</span>
              </Button>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}