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

interface ProjectRow {
  name: string;
  location: string;
  projectCost?: string;
  _fileName?: string;
}

interface ProjectBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (projects: ProjectRow[]) => void;
}

export function ProjectBulkUploadModal({ 
  isOpen, 
  onClose,
  onUploadSuccess
}: ProjectBulkUploadModalProps) {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<ProjectRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  const csvSchema = [
    { field: 'name', label: 'Project Name', required: true, example: 'Downtown Office Building' },
    { field: 'location', label: 'Location', required: true, example: 'New York, NY' },
    { field: 'projectCost', label: 'Project Cost', required: false, example: '150000.00' },
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
      a.download = 'projects-template.csv';
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
      
      // Generate buffer and download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projects-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const parseCSV = (csvText: string): ProjectRow[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: ProjectRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Partial<ProjectRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'project name':
          case 'name':
            row.name = value;
            break;
          case 'location':
            row.location = value;
            break;
          case 'project cost':
          case 'projectcost':
            row.projectCost = value;
            break;
        }
      });

      if (row.name && row.location) {
        rows.push(row as ProjectRow);
      }
    }

    return rows;
  };

  const parseExcel = (data: ArrayBuffer): ProjectRow[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    if (jsonData.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }

    const headers = jsonData[0].map(h => String(h).trim());
    const rows: ProjectRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i].map(v => String(v || '').trim());
      const row: Partial<ProjectRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'project name':
          case 'name':
            row.name = value;
            break;
          case 'location':
            row.location = value;
            break;
          case 'project cost':
          case 'projectcost':
            row.projectCost = value;
            break;
        }
      });

      if (row.name && row.location) {
        rows.push(row as ProjectRow);
      }
    }

    return rows;
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    setErrors([]);
    
    const newData: ProjectRow[] = [];
    const newErrors: string[] = [];
    const newUploadedFiles = new Set(uploadedFiles);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (uploadedFiles.has(file.name)) {
        newErrors.push(`File "${file.name}" has already been uploaded`);
        continue;
      }

      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let fileData: ProjectRow[] = [];

        if (fileExtension === 'csv') {
          const text = await file.text();
          fileData = parseCSV(text);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const arrayBuffer = await file.arrayBuffer();
          fileData = parseExcel(arrayBuffer);
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        fileData.forEach(row => {
          row._fileName = file.name;
        });

        newData.push(...fileData);
        newUploadedFiles.add(file.name);
      } catch (error: any) {
        newErrors.push(`Error processing "${file.name}": ${error.message}`);
      }
    }

    setCsvData(prev => [...prev, ...newData]);
    setUploadedFiles(newUploadedFiles);
    setErrors(newErrors);
    setIsUploading(false);

    if (newData.length > 0) {
      setStep('preview');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const removeRow = (index: number) => {
    setCsvData(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (csvData.length === 0) return;
    
    onUploadSuccess(csvData);
    setStep('success');
    setTimeout(() => {
      handleClose();
    }, 1500);
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

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Upload Project Files</h3>
        <p className="text-sm text-muted-foreground">
          Upload CSV or Excel files containing project information
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => downloadTemplate('csv')}
        >
          <Download className="w-4 h-4 mr-2" />
          Download CSV Template
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => downloadTemplate('excel')}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Excel Template
        </Button>
      </div>

      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
      >
        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground">
            Supports CSV and Excel files (.csv, .xlsx, .xls)
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </>
            )}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Preview Projects</h3>
          <p className="text-sm text-muted-foreground">
            {csvData.length} project{csvData.length !== 1 ? 's' : ''} ready to upload
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Add More Files
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <div className="grid gap-2 p-4">
          {csvData.map((project, index) => (
            <Card key={index} className="p-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.location}</p>
                  {project.projectCost && (
                    <p className="text-xs text-green-600 dark:text-green-400">Cost: ${project.projectCost}</p>
                  )}
                  {project._fileName && (
                    <Badge variant="secondary" className="text-xs">
                      {project._fileName}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-4">
      <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
      <div>
        <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
          Upload Successful!
        </h3>
        <p className="text-sm text-muted-foreground">
          {csvData.length} project{csvData.length !== 1 ? 's' : ''} uploaded successfully
        </p>
      </div>
    </div>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle>Bulk Upload Projects</AlertDialogTitle>
          <AlertDialogDescription>
            Upload multiple projects from CSV or Excel files
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="overflow-y-auto flex-1">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'success' && renderSuccessStep()}
        </div>

        <AlertDialogFooter>
          {step === 'upload' && (
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <AlertDialogAction 
                onClick={handleUpload}
                disabled={csvData.length === 0}
              >
                Upload {csvData.length} Project{csvData.length !== 1 ? 's' : ''}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}