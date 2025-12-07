"use client";

import { useState, useRef, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, X, Check, AlertCircle, CheckCircle2, Loader2, Edit, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useBulkImportDailyLogsMutation } from "@/lib/features/daily-logs/dailyLogsApi";

interface DailyLogRow {
  taskName: string;
  startDate?: string;
  endDate?: string;
  predecessor?: string;
  progress?: string;
  logDate: string;
  notes?: string;
  _fileName?: string;
}

interface DailyLogsBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onUploadSuccess?: () => void;
}

export function DailyLogsBulkUploadModal({ 
  isOpen, 
  onClose, 
  projectId,
  onUploadSuccess
}: DailyLogsBulkUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<DailyLogRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "uploading" | "success" | "error">("upload");
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [bulkImportDailyLogs, { isLoading: isBulkLoading, isSuccess: isBulkSuccess, isError: isBulkError, data: bulkResult }] = useBulkImportDailyLogsMutation();
  const [editForm, setEditForm] = useState<DailyLogRow>({
    taskName: "",
    startDate: "",
    endDate: "",
    predecessor: "",
    progress: "",
    logDate: "",
    notes: "",
  });

  const csvSchema = [
    { field: "taskName", label: "Task Name", required: true, example: "Foundation Pour" },
    { field: "startDate", label: "Start Date", required: false, example: "2024-01-15" },
    { field: "endDate", label: "End Date", required: false, example: "2024-01-20" },
    { field: "predecessor", label: "Predecessor", required: false, example: "10FS+11 wks" },
    { field: "progress", label: "Progress (%)", required: false, example: "75" },
    { field: "logDate", label: "Log Date", required: true, example: "2024-01-18" },
    { field: "notes", label: "Notes", required: false, example: "Weather delayed start by 2 hours" }
  ];

  const downloadTemplate = (format: "csv" | "excel" = "csv") => {
    if (format === "csv") {
      const headers = csvSchema.map((field) => field.label).join(",");
      const example = csvSchema.map((field) => field.example).join(",");
      const csvContent = `${headers}\n${example}`;

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "daily-logs-template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      const headers = csvSchema.map((field) => field.label);
      const example = csvSchema.map((field) => field.example);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DailyLogs");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "daily-logs-template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const parseCSV = (csvText: string): DailyLogRow[] => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows: DailyLogRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Partial<DailyLogRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || "";
        switch (header.toLowerCase()) {
          case "task name":
          case "taskname":
            row.taskName = value;
            break;
          case "start date":
          case "startdate":
            row.startDate = value;
            break;
          case "end date":
          case "enddate":
            row.endDate = value;
            break;
          case "predecessor":
            row.predecessor = value;
            break;
          case "progress (%)":
          case "progress":
            row.progress = value;
            break;
          case "log date":
          case "logdate":
            row.logDate = value;
            break;
          case "notes":
            row.notes = value;
            break;
        }
      });

      if (row.taskName && row.logDate) {
        rows.push(row as DailyLogRow);
      }
    }

    return rows;
  };

  const parseExcel = (buffer: ArrayBuffer): DailyLogRow[] => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheetName = workbook.SheetNames[0];

    if (!worksheetName) {
      throw new Error("Excel file must contain at least one worksheet");
    }

    const worksheet = workbook.Sheets[worksheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      throw new Error("Excel file must have at least a header row and one data row");
    }

    const headers = jsonData[0].map((h: any) => String(h || "").trim());
    const rows: DailyLogRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i] || [];
      const row: Partial<DailyLogRow> = {};

      headers.forEach((header, index) => {
        const value = String(values[index] || "").trim();
        switch (header.toLowerCase()) {
          case "task name":
          case "taskname":
            row.taskName = value;
            break;
          case "start date":
          case "startdate":
            row.startDate = value;
            break;
          case "end date":
          case "enddate":
            row.endDate = value;
            break;
          case "predecessor":
            row.predecessor = value;
            break;
          case "progress (%)":
          case "progress":
            row.progress = value;
            break;
          case "log date":
          case "logdate":
            row.logDate = value;
            break;
          case "notes":
            row.notes = value;
            break;
        }
      });

      if (row.taskName && row.logDate) {
        rows.push(row as DailyLogRow);
      }
    }

    return rows;
  };

  const validateLogs = (data: DailyLogRow[]): string[] => {
    const validationErrors: string[] = [];

    if (data.length === 0) {
      validationErrors.push("No valid data rows found");
      return validationErrors;
    }

    data.forEach((row, index) => {
      const rowNum = index + 1;

      if (!row.taskName?.trim()) {
        validationErrors.push(`Row ${rowNum}: Task Name is required`);
      }

      if (!row.logDate?.trim()) {
        validationErrors.push(`Row ${rowNum}: Log Date is required`);
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.logDate)) {
          validationErrors.push(`Row ${rowNum}: Log Date must be in YYYY-MM-DD format`);
        }
      }

      if (row.startDate && !row.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        validationErrors.push(`Row ${rowNum}: Start Date must be in YYYY-MM-DD format`);
      }

      if (row.endDate && !row.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        validationErrors.push(`Row ${rowNum}: End Date must be in YYYY-MM-DD format`);
      }

      if (row.progress) {
        const progress = parseFloat(row.progress);
        if (isNaN(progress) || progress < 0 || progress > 100) {
          validationErrors.push(`Row ${rowNum}: Progress must be a number between 0 and 100`);
        }
      }
    });

    return validationErrors;
  };

  const isCsvFile = (fileName: string) => 
    fileName.toLowerCase().endsWith('.csv');

  const isExcelFile = (fileName: string) => 
    fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    const newErrors: string[] = [];
    const allLogs: DailyLogRow[] = [...csvData];

    for (const file of Array.from(files)) {
      if (uploadedFiles.has(file.name)) {
        newErrors.push(`File "${file.name}" has already been uploaded`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (!content) {
          newErrors.push(`Failed to read file: ${file.name}`);
          return;
        }

        try {
          let data: DailyLogRow[] = [];
          
          if (isCsvFile(file.name)) {
            data = parseCSV(content as string);
          } else if (isExcelFile(file.name)) {
            data = parseExcel(content as ArrayBuffer);
          }

          const validationErrors = validateLogs(data);
          
          if (validationErrors.length === 0) {
            data.forEach(log => {
              log._fileName = file.name;
            });
            allLogs.push(...data);
            setUploadedFiles(prev => new Set([...prev, file.name]));
            setCsvData(allLogs);
            if (allLogs.length > 0) {
              setStep("preview");
            }
          } else {
            setErrors(newErrors.length > 0 ? newErrors : validationErrors);
          }
        } catch (error) {
          newErrors.push(`Error processing "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          setErrors(newErrors);
        }
      };

      if (isCsvFile(file.name)) {
        reader.readAsText(file);
      } else if (isExcelFile(file.name)) {
        reader.readAsArrayBuffer(file);
      } else {
        newErrors.push(`File "${file.name}" is not a valid CSV or Excel file`);
        setErrors(newErrors);
      }
    }
  };

  // Auto close modal after successful upload
  useEffect(() => {
    if (isBulkSuccess) {
      const timer = setTimeout(() => {
        handleClose();
        onUploadSuccess?.(); // Optional callback for any additional actions
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isBulkSuccess, onUploadSuccess]);

  const handleUpload = async () => {
    if (csvData.length === 0) return;

    try {
      const logsToUpload = csvData.map(({ _fileName, ...log }) => ({
        taskName: log.taskName,
        startDate: log.startDate || null,
        endDate: log.endDate || null,
        predecessor: log.predecessor || null,
        progress: log.progress ? parseFloat(log.progress) : 0,
        logDate: log.logDate,
        notes: log.notes || null
      }));

      await bulkImportDailyLogs({
        projectId,
        logs: logsToUpload
      }).unwrap();

      // setUploadResult will be handled by RTK Query data
      setUploadResult(bulkResult);
    } catch (error: any) {
      setErrors([error?.data?.error || error?.message || 'Unknown error occurred']);
    }
  };

  const removeFile = (fileName: string) => {
    setCsvData((prev) => prev.filter((log) => log._fileName !== fileName));
    setUploadedFiles((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });

    const remainingLogs = csvData.filter((log) => log._fileName !== fileName);
    if (remainingLogs.length > 0) {
      const validationErrors = validateLogs(remainingLogs);
      setErrors(validationErrors);
    } else {
      setErrors([]);
      setStep("upload");
    }
  };

  const updateLogData = (index: number, field: keyof DailyLogRow, value: string) => {
    setCsvData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Re-validate after updating
    const updatedData = [...csvData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    const validationErrors = validateLogs(updatedData);
    setErrors(validationErrors);
  };

  const removeLogRow = (index: number) => {
    setCsvData(prev => prev.filter((_, i) => i !== index));
    
    // Re-validate after removal
    const updatedData = csvData.filter((_, i) => i !== index);
    if (updatedData.length > 0) {
      const validationErrors = validateLogs(updatedData);
      setErrors(validationErrors);
    } else {
      setErrors([]);
      setStep("upload");
    }
  };

  const handleEditLog = (index: number) => {
    const logToEdit = csvData[index];
    setEditForm({
      taskName: logToEdit.taskName,
      startDate: logToEdit.startDate || "",
      endDate: logToEdit.endDate || "",
      predecessor: logToEdit.predecessor || "",
      progress: logToEdit.progress || "",
      logDate: logToEdit.logDate,
      notes: logToEdit.notes || "",
    });
    setEditingIndex(index);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    setCsvData(prev => {
      const updated = [...prev];
      updated[editingIndex] = { 
        ...updated[editingIndex], 
        ...editForm,
        _fileName: updated[editingIndex]._fileName // Keep the original file name
      };
      return updated;
    });

    // Re-validate after updating
    const updatedData = [...csvData];
    updatedData[editingIndex] = { 
      ...updatedData[editingIndex], 
      ...editForm,
    };
    const validationErrors = validateLogs(updatedData);
    setErrors(validationErrors);

    // Close edit modal
    setEditingIndex(null);
    setEditForm({
      taskName: "",
      startDate: "",
      endDate: "",
      predecessor: "",
      progress: "",
      logDate: "",
      notes: "",
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({
      taskName: "",
      startDate: "",
      endDate: "",
      predecessor: "",
      progress: "",
      logDate: "",
      notes: "",
    });
  };

  const handleClose = () => {
    setCsvData([]);
    setErrors([]);
    setStep("upload");
    setUploadedFiles(new Set());
    setIsUploading(false);
    setIsSuccess(false);
    setIsError(false);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Label className="text-base font-medium">Upload CSV or Excel File</Label>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate("csv")}
              className="flex items-center justify-center space-x-2 flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span>CSV Template</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate("excel")}
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
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files) handleFileUpload(files);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Drop your files here, or click to browse
              </h3>
              <p className="text-sm text-muted-foreground">
                Supports CSV and Excel files (.csv, .xlsx, .xls)
              </p>
            </div>
          </div>
          
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) handleFileUpload(files);
            }}
          />
        </div>

        {/* Show uploaded files if any */}
        {uploadedFiles.size > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Uploaded Files:</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(uploadedFiles).map((fileName) => (
                <Badge key={fileName} variant="secondary" className="flex items-center space-x-2 pr-1">
                  <span className="text-xs">{fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileName)}
                    className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-800 dark:text-red-200 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Upload Errors ({errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-32 overflow-y-auto">
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {errors.slice(0, 10).map((error, index) => (
                    <li key={index} className="text-xs sm:text-sm">{error}</li>
                  ))}
                  {errors.length > 10 && (
                    <li className="text-xs italic">... and {errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Preview Daily Logs</h3>
          <p className="text-sm text-muted-foreground">
            Review the {csvData.length} daily log{csvData.length !== 1 ? "s" : ""} before uploading to the project.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep("upload")}
          className="flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload More Files</span>
        </Button>
      </div>

      {/* Files uploaded */}
      {uploadedFiles.size > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Source Files:</Label>
          <div className="flex flex-wrap gap-2">
            {Array.from(uploadedFiles).map((fileName) => (
              <Badge key={fileName} variant="secondary" className="flex items-center space-x-2 pr-1">
                <span className="text-xs">{fileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(fileName)}
                  className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Data preview table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r">
                  Task Name
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r">
                  Log Date
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r">
                  Progress
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r">
                  Start Date
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r">
                  End Date
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r">
                  Notes
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {csvData.map((log, index) => (
                <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                    <span className="font-medium">{log.taskName}</span>
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                    {log.logDate}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                    {log.progress ? `${log.progress}%` : "—"}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                    {log.startDate || "—"}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                    {log.endDate || "—"}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 max-w-32 truncate">
                    {log.notes || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLog(index)}
                        className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title="Edit log"
                      >
                        <Edit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLogRow(index)}
                        className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="Delete log"
                      >
                        <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-800 dark:text-red-200 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Validation Errors ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-32 overflow-y-auto">
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="text-xs sm:text-sm">{error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="text-xs italic">... and {errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderLoadingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Uploading Daily Logs
        </h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we create {csvData.length} daily log{csvData.length !== 1 ? "s" : ""} for this project...
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
        <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Upload Successful!</h3>
        <p className="text-sm text-muted-foreground">
          {`Successfully created ${bulkResult?.importedCount || csvData.length} daily logs for this project`}
        </p>
        <p className="text-xs text-muted-foreground mt-4">This modal will close automatically...</p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">Upload Failed</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {errors.length > 0 ? errors[0] : 'There was an error uploading your daily logs.'}
        </p>
      </div>
    </div>
  );

  const getCurrentStep = () => {
    if (isBulkLoading) return "uploading";
    if (isBulkSuccess) return "success";
    if (isBulkError) return "error";
    return step;
  };

  const renderCurrentStep = () => {
    const currentStep = getCurrentStep();

    switch (currentStep) {
      case "upload":
        return renderUploadStep();
      case "preview":
        return renderPreviewStep();
      case "uploading":
        return renderLoadingStep();
      case "success":
        return renderSuccessStep();
      case "error":
        return renderErrorStep();
      default:
        return renderUploadStep();
    }
  };

  const getModalTitle = () => {
    const currentStep = getCurrentStep();

    switch (currentStep) {
      case "uploading":
        return "Uploading Daily Logs";
      case "success":
        return "Upload Complete";
      case "error":
        return "Upload Failed";
      default:
        return "Bulk Upload Daily Logs";
    }
  };

  const getModalDescription = () => {
    const currentStep = getCurrentStep();

    switch (currentStep) {
      case "uploading":
        return "Please wait while we process your daily logs...";
      case "success":
        return "Your daily logs have been successfully created for this project.";
      case "error":
        return "There was an error uploading your daily logs.";
      default:
        return "Upload multiple daily logs at once using CSV or Excel files. All logs will be added to this project.";
    }
  };

  const shouldShowFooter = () => {
    const currentStep = getCurrentStep();
    return !["uploading", "success"].includes(currentStep);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={!isBulkLoading ? handleClose : undefined}>
      <AlertDialogContent className="max-w-5xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
        <AlertDialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isBulkLoading}
            className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
          <AlertDialogTitle className="text-lg sm:text-xl pr-8">{getModalTitle()}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            {getModalDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 sm:py-6">{renderCurrentStep()}</div>

        {shouldShowFooter() && (
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel
              onClick={handleClose}
              disabled={isUploading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </AlertDialogCancel>

            {step === "upload" && csvData.length > 0 && errors.length === 0 && (
              <Button
                onClick={() => setStep("preview")}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Check className="h-4 w-4" />
                <span>
                  Next: Preview {csvData.length} Log{csvData.length !== 1 ? "s" : ""}
                </span>
              </Button>
            )}

            {step === "preview" && csvData.length > 0 && errors.length === 0 && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>
                  {isUploading ? "Uploading..." : `Create ${csvData.length} Daily Log${csvData.length !== 1 ? "s" : ""}`}
                </span>
              </Button>
            )}

            {isBulkError && (
              <Button
                onClick={() => {
                  setErrors([]);
                  setStep("upload");
                }}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto order-1 sm:order-2"
              >
                <Upload className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>

      {/* Edit Log Modal */}
      <Dialog open={editingIndex !== null} onOpenChange={() => handleCancelEdit()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Daily Log</DialogTitle>
            <DialogDescription>
              Update the daily log information before uploading.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Name and Log Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-taskName">Task Name *</Label>
                <Input
                  id="edit-taskName"
                  value={editForm.taskName}
                  onChange={(e) => setEditForm({ ...editForm, taskName: e.target.value })}
                  placeholder="Enter task name"
                />
              </div>

              <div>
                <Label htmlFor="edit-logDate">Log Date *</Label>
                <Input
                  id="edit-logDate"
                  type="date"
                  value={editForm.logDate}
                  onChange={(e) => setEditForm({ ...editForm, logDate: e.target.value })}
                />
              </div>
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Predecessor and Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-predecessor">Predecessor</Label>
                <Input
                  id="edit-predecessor"
                  value={editForm.predecessor}
                  onChange={(e) => setEditForm({ ...editForm, predecessor: e.target.value })}
                  placeholder="Enter predecessor tasks"
                />
              </div>

              <div>
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editForm.progress}
                  onChange={(e) => setEditForm({ ...editForm, progress: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Enter any additional notes or details"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
}