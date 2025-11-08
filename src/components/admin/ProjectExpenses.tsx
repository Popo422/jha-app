"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Plus, Upload, Receipt, Calendar, DollarSign, FileText, Paperclip, X, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/features/expenses/expensesApi";
import { 
  useGetProjectExpensesQuery, 
  useCreateProjectExpenseMutation, 
  useUpdateProjectExpenseMutation, 
  useDeleteProjectExpenseMutation,
  useUploadProjectExpenseDocumentMutation,
  type ProjectExpenseWithDetails 
} from "@/lib/features/project-expenses/projectExpensesApi";

interface ProjectExpensesProps {
  projectId: string;
}

interface AttachedFile {
  file: File;
  description: string;
}

export default function ProjectExpenses({ projectId }: ProjectExpensesProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingExpense, setEditingExpense] = useState<ProjectExpenseWithDetails | null>(null);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '1',
    totalCost: '',
    date: '',
    category: 'Other',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    totalCost: '',
    date: '',
    category: 'Other',
  });
  const [uploadedFiles, setUploadedFiles] = useState<AttachedFile[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const { toast, showToast } = useToast();

  // API hooks
  const { data: expensesData, isLoading, isFetching, refetch, error } = useGetProjectExpensesQuery({
    projectId,
    page: 1,
    pageSize: 50,
    search: debouncedSearch || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  
  const [createExpense, { isLoading: isCreating }] = useCreateProjectExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateProjectExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteProjectExpenseMutation();
  const [uploadDocument] = useUploadProjectExpenseDocumentMutation();

  const expenses = expensesData?.expenses || [];
  const totalExpenseAmount = expensesData?.totalAmount || 0;

  // Check if any filters are active
  const hasActiveFilters = selectedCategory !== "all" || dateFrom || dateTo;

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory("all");
    setDateFrom("");
    setDateTo("");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Table columns
  const columns = useMemo<ColumnDef<ProjectExpenseWithDetails>[]>(() => [
    {
      header: "Expense Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500 truncate max-w-xs" title={row.original.description}>
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-500" />
          {formatDate(row.original.date)}
        </div>
      ),
    },
    {
      header: "Price",
      accessorKey: "price",
      cell: ({ row }) => (
        <div className="text-left font-medium">
          {formatCurrency(row.original.price)}
        </div>
      ),
    },
    {
      header: "Quantity",
      accessorKey: "quantity",
      cell: ({ row }) => (
        <div className="text-left">
          {parseFloat(row.original.quantity)}
        </div>
      ),
    },
    {
      header: "Total Cost",
      accessorKey: "totalCost",
      cell: ({ row }) => (
        <div className="text-left font-semibold">
          {formatCurrency(row.original.totalCost)}
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: ({ row }) => (
        <div>
          <Badge variant="secondary" className="text-xs">
            {row.original.category}
          </Badge>
        </div>
      ),
    },
    {
      header: "Docs",
      accessorKey: "documentCount",
      cell: ({ row }) => (
        <div className="flex items-center text-left">
          <FileText className="h-4 w-4 mr-1 text-gray-500" />
          {row.original.documentCount}
        </div>
      ),
    },
    {
      header: "Created By",
      accessorKey: "createdByName",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.createdByName}</div>
      ),
    },
  ], []);

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteExpense({ projectId, expenseId: id }).unwrap();
      showToast("Expense deleted successfully", "success");
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to delete expense", "error");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const deletePromises = ids.map(id => deleteExpense({ projectId, expenseId: id }).unwrap());
      await Promise.all(deletePromises);
      showToast(`Successfully deleted ${ids.length} expense${ids.length > 1 ? 's' : ''}`, "success");
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to delete some expenses", "error");
    }
  };

  // Handle edit
  const handleEdit = (expense: ProjectExpenseWithDetails) => {
    setEditingExpense(expense);
    setEditForm({
      name: expense.name,
      description: expense.description || '',
      price: expense.price,
      quantity: expense.quantity,
      totalCost: expense.totalCost,
      date: expense.date,
      category: expense.category || 'Other',
    });
    setExistingDocuments(expense.documents || []);
    setDocumentsToDelete([]);
    setUploadedFiles([]);
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editingExpense) return;
    
    try {
      await updateExpense({
        projectId,
        expenseId: editingExpense.id,
        name: editForm.name,
        description: editForm.description || undefined,
        price: parseFloat(editForm.price),
        quantity: parseFloat(editForm.quantity),
        totalCost: parseFloat(editForm.totalCost),
        date: editForm.date,
        category: editForm.category,
      }).unwrap();

      // Delete removed documents
      if (documentsToDelete.length > 0) {
        // Handle document deletion here if needed
        console.log('Documents to delete:', documentsToDelete);
      }

      // Upload new files if any
      if (uploadedFiles.length > 0) {
        for (const attachedFile of uploadedFiles) {
          await uploadDocument({
            projectId,
            expenseId: editingExpense.id,
            file: attachedFile.file,
            description: attachedFile.description,
          });
        }
      }

      showToast("Expense updated successfully", "success");
      setEditingExpense(null);
      setUploadedFiles([]);
      setExistingDocuments([]);
      setDocumentsToDelete([]);
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to update expense", "error");
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingExpense(null);
    setEditForm({
      name: '',
      description: '',
      price: '',
      quantity: '',
      totalCost: '',
      date: '',
      category: 'Other',
    });
    setUploadedFiles([]);
    setExistingDocuments([]);
    setDocumentsToDelete([]);
  };

  // Handle create expense
  const handleCreateExpense = async () => {
    if (!createForm.name.trim()) return;
    
    try {
      const result = await createExpense({
        projectId,
        name: createForm.name,
        description: createForm.description || undefined,
        price: parseFloat(createForm.price),
        quantity: parseFloat(createForm.quantity),
        totalCost: parseFloat(createForm.totalCost),
        date: createForm.date,
        category: createForm.category,
      }).unwrap();

      // Upload files if any
      if (uploadedFiles.length > 0 && result.expense) {
        for (const attachedFile of uploadedFiles) {
          await uploadDocument({
            projectId,
            expenseId: result.expense.id,
            file: attachedFile.file,
            description: attachedFile.description,
          });
        }
      }

      showToast("Expense created successfully", "success");
      handleCreateCancel();
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to create expense", "error");
    }
  };

  // Handle create cancel
  const handleCreateCancel = () => {
    setIsCreatingExpense(false);
    setCreateForm({
      name: '',
      description: '',
      price: '',
      quantity: '1',
      totalCost: '',
      date: '',
      category: 'Other',
    });
    setUploadedFiles([]);
  };

  // File upload handlers
  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const attachedFile: AttachedFile = {
          file,
          description: `Supporting document for expense`
        };
        setUploadedFiles(prev => [...prev, attachedFile]);
      }
      showToast('Files added successfully', 'success');
    } catch (error: any) {
      showToast('Failed to add files', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDocument = (documentId: string) => {
    setDocumentsToDelete(prev => [...prev, documentId]);
    setExistingDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else {
      return '📎';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Project Expenses</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              Track expenses specifically for this project
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              className="flex items-center gap-2"
              onClick={() => setIsCreatingExpense(true)}
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
            <Button 
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => router.push(`/admin/project-dashboard/${projectId}/expenses/upload`)}
            >
              <Upload className="h-4 w-4" />
              Upload Receipts
            </Button>
          </div>
        </div>
      </div>

      <AdminDataTable
        data={expenses}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(expense) => expense.id}
        exportFilename={`project-${projectId}-expenses`}
        exportHeaders={["Name", "Description", "Date", "Price", "Quantity", "Total Cost", "Category", "Created By"]}
        getExportData={(expense) => [
          expense.name,
          expense.description || '',
          formatDate(expense.date),
          formatCurrency(expense.price),
          expense.quantity,
          formatCurrency(expense.totalCost),
          expense.category,
          expense.createdByName
        ]}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <div className="text-xs font-medium">Category</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-40 justify-between text-xs">
                    <span className="truncate">
                      {selectedCategory === "all" ? "All Categories" : selectedCategory}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-48 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                    All Categories
                  </DropdownMenuItem>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <DropdownMenuItem key={category} onClick={() => setSelectedCategory(category)}>
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-medium">Date From</div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 text-xs"
              />
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-medium">Date To</div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 text-xs"
              />
            </div>
            
            {hasActiveFilters && (
              <div className="space-y-1">
                <div className="text-xs font-medium">&nbsp;</div>
                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Total Expenses Summary */}
      {!isLoading && expenses.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Expense: {formatCurrency(totalExpenseAmount.toString())}
            </div>
          </div>
        </div>
      )}

      {/* Create Expense Dialog */}
      <Dialog open={isCreatingExpense} onOpenChange={(open) => !open && handleCreateCancel()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Expense Name *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Enter expense name"
              />
            </div>
            
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Enter expense description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-price">Price *</Label>
                <Input
                  id="create-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="create-quantity">Quantity *</Label>
                <Input
                  id="create-quantity"
                  type="number"
                  step="1"
                  min="1"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="create-date">Date *</Label>
              <Input
                id="create-date"
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="create-category">Category *</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9">
                    <span>{createForm.category}</span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full max-h-48 overflow-y-auto">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <DropdownMenuItem 
                      key={category} 
                      onClick={() => setCreateForm({ ...createForm, category })}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <Label>File Attachments (Optional)</Label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {isUploading ? 'Adding files...' : 'Add Files'}
                </Button>
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((attachedFile, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border max-w-xs">
                        <span className="text-sm truncate flex-1 min-w-0">{attachedFile.file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="create-total">Total Cost *</Label>
              <Input
                id="create-total"
                type="number"
                step="0.01"
                min="0"
                value={createForm.totalCost}
                onChange={(e) => setCreateForm({ ...createForm, totalCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCreateCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateExpense} 
              disabled={!createForm.name.trim() || !createForm.price || !createForm.totalCost || !createForm.date || isCreating || isUploading}
            >
              {(isCreating || isUploading) ? 'Creating...' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog - Similar structure to create but for editing */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && handleEditCancel()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Edit form fields - similar to create form */}
            <div>
              <Label htmlFor="edit-name">Expense Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter expense name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter expense description"
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
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
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
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Category *</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9">
                    <span>{editForm.category}</span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full max-h-48 overflow-y-auto">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <DropdownMenuItem 
                      key={category} 
                      onClick={() => setEditForm({ ...editForm, category })}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <Label htmlFor="edit-total">Total Cost *</Label>
              <Input
                id="edit-total"
                type="number"
                step="0.01"
                min="0"
                value={editForm.totalCost}
                onChange={(e) => setEditForm({ ...editForm, totalCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSave} 
              disabled={!editForm.name.trim() || !editForm.price || !editForm.totalCost || !editForm.date || isUpdating || isUploading}
            >
              {(isUpdating || isUploading) ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}