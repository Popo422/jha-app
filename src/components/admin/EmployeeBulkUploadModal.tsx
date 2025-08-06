"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, X, Check, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface SubcontractorData {
  name: string;
}

interface EmployeeRow {
  firstName: string;
  lastName: string;
  email: string;
  rate?: string;
  companyName?: string;
  language?: string;
  _fileName?: string;
}

interface EmployeeBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (employees: EmployeeRow[]) => void;
  availableSubcontractors: SubcontractorData[];
}

export function EmployeeBulkUploadModal({ 
  isOpen, 
  onClose,
  onUploadSuccess,
  availableSubcontractors
}: EmployeeBulkUploadModalProps) {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<EmployeeRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  const csvSchema = [
    { field: 'firstName', label: t('admin.firstName') || 'First Name', required: true, example: 'John' },
    { field: 'lastName', label: t('admin.lastName') || 'Last Name', required: true, example: 'Smith' },
    { field: 'email', label: t('admin.email') || 'Email', required: true, example: 'john.smith@email.com' },
    { field: 'rate', label: t('admin.rate') || 'Rate', required: false, example: '50.00' },
    { field: 'companyName', label: t('admin.subcontractor') || 'Subcontractor', required: false, example: 'ABC Construction' },
    { field: 'language', label: t('settings.language') || 'Language', required: false, example: 'en' },
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
      a.download = 'employees-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      const headers = csvSchema.map(field => field.label);
      const example = csvSchema.map(field => field.example);
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employees-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const parseCSV = (csvText: string): EmployeeRow[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error(t('admin.errors.csvHeaderRequired') || 'CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    const rows: EmployeeRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Partial<EmployeeRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header) {
          case 'first name':
          case 'firstname':
            row.firstName = value;
            break;
          case 'last name':
          case 'lastname':
            row.lastName = value;
            break;
          case 'email':
            row.email = value;
            break;
          case 'rate':
            row.rate = value || undefined;
            break;
          case 'subcontractor':
          case 'companyname':
          case 'company name':
            row.companyName = value || undefined;
            break;
          case 'language':
            row.language = value || 'en';
            break;
        }
      });

      if (row.firstName || row.lastName || row.email) {
        // Default language to 'en' if not provided
        if (!row.language) {
          row.language = 'en';
        }
        rows.push(row as EmployeeRow);
      }
    }

    return rows;
  };

  const parseExcel = (buffer: ArrayBuffer): EmployeeRow[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheetName = workbook.SheetNames[0];
    
    if (!worksheetName) {
      throw new Error(t('admin.errors.excelSheetRequired') || 'Excel file must contain at least one worksheet');
    }

    const worksheet = workbook.Sheets[worksheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error(t('admin.errors.excelHeaderRequired') || 'Excel file must have at least a header row and one data row');
    }

    const headers = jsonData[0].map((h: any) => String(h || '').trim().toLowerCase());
    const rows: EmployeeRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i] || [];
      const row: Partial<EmployeeRow> = {};

      headers.forEach((header, index) => {
        const value = String(values[index] || '').trim();
        switch (header) {
          case 'first name':
          case 'firstname':
            row.firstName = value;
            break;
          case 'last name':
          case 'lastname':
            row.lastName = value;
            break;
          case 'email':
            row.email = value;
            break;
          case 'rate':
            row.rate = value || undefined;
            break;
          case 'subcontractor':
          case 'companyname':
          case 'company name':
            row.companyName = value || undefined;
            break;
          case 'language':
            row.language = value || 'en';
            break;
        }
      });

      if (row.firstName || row.lastName || row.email) {
        // Default language to 'en' if not provided
        if (!row.language) {
          row.language = 'en';
        }
        rows.push(row as EmployeeRow);
      }
    }

    return rows;
  };

  const validateEmployees = (employees: EmployeeRow[]): string[] => {
    const errors: string[] = [];
    const emailSet = new Set<string>();

    employees.forEach((employee, index) => {
      const rowNum = index + 2; // Account for header row

      if (!employee.firstName?.trim()) {
        errors.push(t('admin.errors.firstNameRequiredRow', { row: rowNum }) || `Row ${rowNum}: First Name is required`);
      }
      if (!employee.lastName?.trim()) {
        errors.push(t('admin.errors.lastNameRequiredRow', { row: rowNum }) || `Row ${rowNum}: Last Name is required`);
      }
      if (!employee.email?.trim()) {
        errors.push(t('admin.errors.emailRequiredRow', { row: rowNum }) || `Row ${rowNum}: Email is required`);
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(employee.email)) {
          errors.push(t('admin.errors.invalidEmailRow', { row: rowNum }) || `Row ${rowNum}: Invalid email format`);
        }
        
        const email = employee.email.toLowerCase();
        if (emailSet.has(email)) {
          errors.push(t('admin.errors.duplicateEmailRow', { row: rowNum }) || `Row ${rowNum}: Duplicate email address in file`);
        } else {
          emailSet.add(email);
        }
      }
      if (employee.rate && isNaN(Number(employee.rate))) {
        errors.push(t('admin.errors.invalidRateRow', { row: rowNum }) || `Row ${rowNum}: Rate must be a valid number`);
      }
      if (employee.companyName && !availableSubcontractors.some(sub => sub.name === employee.companyName)) {
        errors.push(t('admin.errors.invalidSubcontractorRow', { row: rowNum, company: employee.companyName }) || `Row ${rowNum}: Subcontractor "${employee.companyName}" not found`);
      }
    });

    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newErrors: string[] = [];
    const allEmployees: EmployeeRow[] = [];
    let processedFiles = 0;

    const isExcelFile = (fileName: string) => {
      return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    };

    const isCsvFile = (fileName: string) => {
      return fileName.endsWith('.csv');
    };

    Array.from(files).forEach((file, fileIndex) => {
      if (!isCsvFile(file.name) && !isExcelFile(file.name)) {
        newErrors.push(t('admin.errors.invalidFileType', { file: file.name }) || `File "${file.name}": Please upload only CSV or Excel files`);
        processedFiles++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let employees: EmployeeRow[] = [];
          
          if (isCsvFile(file.name)) {
            const csvText = e.target?.result as string;
            employees = parseCSV(csvText);
          } else if (isExcelFile(file.name)) {
            const buffer = e.target?.result as ArrayBuffer;
            employees = parseExcel(buffer);
          }
          
          const employeesWithFile = employees.map(employee => ({
            ...employee,
            _fileName: file.name
          }));
          
          allEmployees.push(...employeesWithFile);
          setUploadedFiles(prev => new Set([...prev, file.name]));
        } catch (error) {
          newErrors.push(t('admin.errors.fileParseError', { file: file.name, error: error instanceof Error ? error.message : 'Error parsing file' }) || `File "${file.name}": ${error instanceof Error ? error.message : 'Error parsing file'}`);
        }

        processedFiles++;
        
        if (processedFiles === files.length) {
          if (allEmployees.length > 0) {
            const validationErrors = validateEmployees(allEmployees);
            const allErrors = [...newErrors, ...validationErrors];
            
            setErrors(allErrors);
            setCsvData(prev => [...prev, ...allEmployees]);
            if (allErrors.length === 0) {
              setStep('preview');
            }
          } else {
            setErrors(newErrors.length > 0 ? newErrors : [t('admin.errors.noValidData') || 'No valid employee data found in uploaded files']);
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
      const employeesForUpload = csvData.map(({ _fileName, ...employee }) => employee);
      onUploadSuccess(employeesForUpload);
      setStep('success');
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors([t('admin.errors.uploadFailed') || 'Failed to upload employees']);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileName: string) => {
    setCsvData(prev => prev.filter(employee => employee._fileName !== fileName));
    setUploadedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    
    const remainingEmployees = csvData.filter(employee => employee._fileName !== fileName);
    if (remainingEmployees.length > 0) {
      const validationErrors = validateEmployees(remainingEmployees);
      setErrors(validationErrors);
    } else {
      setErrors([]);
      setStep('upload');
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
          <Label className="text-base font-medium">{t('admin.uploadCsvExcel')}</Label>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('csv')}
              className="flex items-center justify-center space-x-2 flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span>{t('admin.csvTemplate')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('excel')}
              className="flex items-center justify-center space-x-2 flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span>{t('admin.excelTemplate')}</span>
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
                {t('admin.clickToUpload')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('admin.uploadMultipleFiles')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('admin.requiredFields')}: {t('admin.firstName')}, {t('admin.lastName')}, {t('admin.email')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('admin.optionalFields')}: {t('admin.rate')}, {t('admin.subcontractor')}
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
                  {t('admin.employeesLoadedCount', { count: csvData.length })}
                </span>
              </div>
              {uploadedFiles.size > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300">
                    {t('admin.uploadedFiles')}:
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
              <span>{t('admin.validationErrors')}</span>
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
            {t('admin.previewData')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.employeesReadyCount', { count: csvData.length })}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setStep('upload')}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <X className="h-4 w-4" />
          <span>{t('admin.uploadDifferentFile')}</span>
        </Button>
      </div>
      
      <Card className="border-gray-200 dark:border-gray-700">
        <div className="max-h-96 overflow-auto">
          <div className="block sm:hidden">
            <div className="space-y-3 p-4">
              {csvData.map((employee, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {employee._fileName && (
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs">
                          {employee._fileName}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">{t('admin.firstName')}:</span>
                      <p className="text-gray-900 dark:text-gray-100">{employee.firstName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">{t('admin.lastName')}:</span>
                      <p className="text-gray-900 dark:text-gray-100">{employee.lastName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">{t('admin.email')}:</span>
                      <p className="text-gray-900 dark:text-gray-100 text-xs font-mono break-all">{employee.email}</p>
                    </div>
                    {employee.rate && (
                      <div>
                        <span className="font-medium text-gray-500 dark:text-gray-400">{t('admin.rate')}:</span>
                        <p className="text-gray-900 dark:text-gray-100">{employee.rate}</p>
                      </div>
                    )}
                    {employee.companyName && (
                      <div>
                        <span className="font-medium text-gray-500 dark:text-gray-400">{t('admin.subcontractor')}:</span>
                        <p className="text-gray-900 dark:text-gray-100">{employee.companyName}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">{t('settings.language')}:</span>
                      <p className="text-gray-900 dark:text-gray-100">
                        {employee.language === 'en' && t('settings.english')}
                        {employee.language === 'es' && t('settings.spanish')}
                        {employee.language === 'pl' && t('settings.polish')}
                        {employee.language === 'zh' && t('settings.chinese')}
                        {!employee.language && t('settings.english')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    {t('admin.firstName')}
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    {t('admin.lastName')}
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    {t('admin.email')}
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    {t('admin.rate')}
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    {t('admin.subcontractor')}
                  </th>
                  <th className="text-left p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                    {t('settings.language')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((employee, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 text-gray-900 dark:text-gray-100">{employee.firstName}</td>
                    <td className="p-4 text-gray-900 dark:text-gray-100">{employee.lastName}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-mono text-xs">{employee.email}</td>
                    <td className="p-4">
                      {employee.rate ? (
                        <span className="text-gray-700 dark:text-gray-300">{employee.rate}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {employee.companyName ? (
                        <span className="text-gray-700 dark:text-gray-300">{employee.companyName}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {employee.language === 'en' && t('settings.english')}
                        {employee.language === 'es' && t('settings.spanish')}
                        {employee.language === 'pl' && t('settings.polish')}
                        {employee.language === 'zh' && t('settings.chinese')}
                        {!employee.language && t('settings.english')}
                      </span>
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

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
          {t('admin.uploadSuccessful')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('admin.employeesAddedCount', { count: csvData.length })}
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          {t('admin.modalAutoClose')}
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
                {t('admin.addingEmployees')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('admin.waitForEmployees', { count: csvData.length })}
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
        return t('admin.addingEmployees');
      case 'success':
        return t('admin.uploadComplete');
      default:
        return t('admin.bulkUploadEmployees');
    }
  };

  const getModalDescription = () => {
    const currentStep = getCurrentStep();
    
    switch (currentStep) {
      case 'uploading':
        return t('admin.processingEmployees');
      case 'success':
        return t('admin.employeesAdded');
      default:
        return t('admin.bulkUploadDescription');
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
              {t('admin.cancel')}
            </AlertDialogCancel>
            
            {step === 'upload' && csvData.length > 0 && errors.length === 0 && (
              <Button 
                onClick={() => setStep('preview')} 
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Check className="h-4 w-4" />
                <span>{t('admin.previewEmployees', { count: csvData.length })}</span>
              </Button>
            )}
            
            {step === 'preview' && (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || csvData.length === 0}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Upload className="h-4 w-4" />
                <span>{t('admin.addEmployees', { count: csvData.length })}</span>
              </Button>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}