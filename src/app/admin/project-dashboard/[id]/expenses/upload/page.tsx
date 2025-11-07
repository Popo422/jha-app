"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft,
  Upload, 
  Link, 
  Brain, 
  Receipt, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  X,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Save,
  Plus
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useUploadReceiptMutation, useExtractExpensesMutation, EXPENSE_CATEGORIES } from "@/lib/features/expenses/expensesApi";
import { useBulkImportProjectExpensesMutation } from "@/lib/features/project-expenses/projectExpensesApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UploadStep = 'upload' | 'extract' | 'review';

interface ExtractedExpense {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  totalCost: number;
  date: string;
  category: string;
}

export default function ProjectUploadReceiptsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [activeStep, setActiveStep] = useState<UploadStep>('upload');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [extractedExpenses, setExtractedExpenses] = useState<ExtractedExpense[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "1",
    totalCost: "",
    date: "",
    category: "Other"
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // RTK Query hooks
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();
  const [extractExpenses, { isLoading: isExtracting }] = useExtractExpensesMutation();
  const [bulkImportExpenses, { isLoading: isImporting }] = useBulkImportProjectExpensesMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveUrl = () => {
    setFileUrl('');
  };

  const handleUpload = async () => {
    try {
      let result;
      
      if (uploadType === 'file' && selectedFile) {
        result = await uploadReceipt({ file: selectedFile }).unwrap();
      } else if (uploadType === 'url' && fileUrl) {
        result = await uploadReceipt({ url: fileUrl }).unwrap();
      } else {
        showToast("Please select a file or enter a URL", "error");
        return;
      }

      setUploadedFileUrl(result.fileUrl);
      setActiveStep('extract');
      showToast("Receipt uploaded successfully", "success");
      
      // Automatically start extraction
      handleExtract(result.fileUrl);
    } catch (error: any) {
      showToast(error?.data?.error || "Upload failed", "error");
    }
  };

  const handleExtract = async (fileUrlParam?: string) => {
    try {
      const urlToUse = fileUrlParam || uploadedFileUrl;
      const result = await extractExpenses({
        fileUrl: urlToUse
      }).unwrap();

      // Convert to our interface format
      const extractedData = result.extractedExpenses.map((exp: any, index: number) => ({
        id: (index + 1).toString(),
        name: exp.name,
        description: exp.description || '',
        price: exp.price,
        quantity: exp.quantity,
        totalCost: exp.price * exp.quantity,
        date: exp.date || new Date().toISOString().split('T')[0],
        category: exp.category || 'Other'
      }));

      setExtractedExpenses(extractedData);
      setActiveStep('review');
      showToast(`Extracted ${extractedData.length} expense items`, "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Extraction failed", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      quantity: "1",
      totalCost: "",
      date: "",
      category: "Other"
    });
  };

  const handleEditExpense = (index: number) => {
    if (index === -1) {
      // Adding new expense
      resetForm();
      setEditingIndex(-1);
    } else {
      // Editing existing expense
      const expense = extractedExpenses[index];
      setFormData({
        name: expense.name,
        description: expense.description,
        price: expense.price.toString(),
        quantity: expense.quantity.toString(),
        totalCost: expense.totalCost.toString(),
        date: expense.date,
        category: expense.category || 'Other'
      });
      setEditingIndex(index);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    if (!formData.name.trim()) {
      showToast("Expense name is required", "error");
      return;
    }

    const price = parseFloat(formData.price) || 0;
    const quantity = parseFloat(formData.quantity) || 1;
    const totalCost = parseFloat(formData.totalCost) || 0;

    if (editingIndex === -1) {
      // Adding new expense
      const newExpense: ExtractedExpense = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        price,
        quantity,
        totalCost,
        date: formData.date,
        category: formData.category
      };

      setExtractedExpenses([...extractedExpenses, newExpense]);
      showToast("Expense added successfully", "success");
    } else {
      // Editing existing expense
      const updatedExpenses = [...extractedExpenses];
      updatedExpenses[editingIndex] = {
        ...updatedExpenses[editingIndex],
        name: formData.name,
        description: formData.description,
        price,
        quantity,
        totalCost,
        date: formData.date,
        category: formData.category
      };

      setExtractedExpenses(updatedExpenses);
      showToast("Expense updated successfully", "success");
    }

    setEditingIndex(null);
    resetForm();
  };

  const handleDeleteExpense = (index: number) => {
    const updatedExpenses = extractedExpenses.filter((_, i) => i !== index);
    setExtractedExpenses(updatedExpenses);
    
    if (editingIndex === index) {
      setEditingIndex(null);
      resetForm();
    }
    
    showToast("Expense deleted", "success");
  };

  const handleImportExpenses = async () => {
    if (extractedExpenses.length === 0) {
      showToast("No expenses to import", "error");
      return;
    }

    try {
      // Convert extracted expenses to the format expected by the API
      const expensesToImport = extractedExpenses.map(exp => ({
        name: exp.name,
        description: exp.description,
        price: exp.price,
        quantity: exp.quantity,
        totalCost: exp.totalCost,
        date: exp.date,
        category: exp.category
      }));

      const result = await bulkImportExpenses({
        projectId,
        extractedExpenses: expensesToImport
      }).unwrap();

      showToast(`Successfully imported ${result.count} expenses to this project`, "success");
      router.push(`/admin/project-dashboard/${projectId}?tab=expenses`);
    } catch (error: any) {
      showToast(error?.data?.error || "Import failed", "error");
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStepProgress = () => {
    switch (activeStep) {
      case 'upload': return 0;
      case 'extract': return 33;
      case 'review': return 66;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/project-dashboard/${projectId}?tab=expenses`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project Expenses
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Upload Receipts for Project
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload receipt images and let AI extract expense line items. All expenses will be automatically assigned to this project.
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="mb-4" />
            
            <div className="flex justify-between">
              {[
                { key: 'upload', label: 'Upload Receipt', icon: Upload },
                { key: 'extract', label: 'AI Analysis', icon: Brain },
                { key: 'review', label: 'Review & Import', icon: Receipt }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2
                    ${activeStep === key ? 'bg-blue-600 text-white border-blue-600' :
                      getStepProgress() > (key === 'extract' ? 0 : key === 'review' ? 33 : 66) ?
                      'bg-green-600 text-white border-green-600' :
                      'bg-gray-200 text-gray-600 border-gray-300'}
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs mt-1 text-center">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">
            
            {activeStep === 'upload' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2">Upload Receipt for OCR</h2>
                  <p className="text-gray-600">Upload your receipt and AI will extract individual expense line items for review</p>
                </div>

                <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as 'file' | 'url')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="file">Upload Image</TabsTrigger>
                    <TabsTrigger value="url">From URL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="file" className="space-y-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      {selectedFile ? (
                        <div className="space-y-3">
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                            <div>
                              <p className="text-lg font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={handleRemoveFile}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500">
                            Click to select a different file or drag and drop to replace
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg text-gray-600 mb-2">
                            Drop your receipt here, or click to select
                          </p>
                          <p className="text-sm text-gray-500">
                            Supports JPG, PNG, PDF up to 50MB
                          </p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileSelect}
                    />
                  </TabsContent>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div>
                      <Label htmlFor="fileUrl" className="text-base">Receipt URL</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="fileUrl"
                          placeholder="https://example.com/receipt.jpg"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                        />
                        {fileUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleRemoveUrl}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={handleUpload}
                    disabled={(!selectedFile && !fileUrl) || isUploading}
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload & Continue
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 'extract' && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                    <Brain className="h-12 w-12 text-blue-600 animate-pulse" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold mb-4">AI OCR in Progress</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Our AI is reading your receipt and extracting expense line items...
                  </p>
                </div>
                
                <Button 
                  onClick={() => handleExtract()}
                  disabled={isExtracting}
                  size="lg"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isExtracting ? 'Extracting Expenses...' : 'Extract Expenses'}
                </Button>
              </div>
            )}

            {activeStep === 'review' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Review Extracted Expenses</h2>
                  <p className="text-lg text-gray-600">
                    Found {extractedExpenses.length} expense items - review and edit as needed
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> All expenses will be automatically assigned to this project when imported.
                    </p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Extracted Expenses ({extractedExpenses.length})</CardTitle>
                      <Button onClick={() => handleEditExpense(-1)} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Expense
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {extractedExpenses.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No expenses extracted</p>
                        <p className="text-sm">Upload a different receipt or add expenses manually</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium">Name</th>
                              <th className="text-left py-3 px-4 font-medium">Description</th>
                              <th className="text-left py-3 px-4 font-medium">Price</th>
                              <th className="text-left py-3 px-4 font-medium">Qty</th>
                              <th className="text-left py-3 px-4 font-medium">Total</th>
                              <th className="text-left py-3 px-4 font-medium">Category</th>
                              <th className="text-left py-3 px-4 font-medium">Date</th>
                              <th className="text-right py-3 px-4 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extractedExpenses.map((expense, index) => (
                              <tr key={expense.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="font-medium">{expense.name}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm text-gray-600 max-w-xs truncate" title={expense.description}>
                                    {expense.description || '-'}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-left">{formatCurrency(expense.price)}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-left">{expense.quantity}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-left font-semibold text-green-600">
                                    {formatCurrency(expense.totalCost)}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm">
                                    <Badge variant="secondary" className="text-xs">
                                      {expense.category}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-left text-sm">
                                    {formatDate(expense.date) || 'No date'}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditExpense(index)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteExpense(index)}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleImportExpenses}
                    disabled={extractedExpenses.length === 0 || isImporting}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Import {extractedExpenses.length} Expenses to Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Edit/Add Expense Dialog */}
        <Dialog open={editingIndex !== null} onOpenChange={(open) => {
          if (!open) {
            setEditingIndex(null);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingIndex === -1 ? 'Add New Expense' : 'Edit Expense'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Expense Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter expense name"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Price *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-quantity">Quantity *</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    step="1"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-total">Total Cost *</Label>
                <Input
                  id="edit-total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdit} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingIndex === -1 ? 'Add Expense' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingIndex(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}