"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Plus, Edit, Save, X, ArrowLeft, RefreshCw, ArrowUpDown, Copy, UserCheck, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useGetCompanyContractorsQuery,
  useCreateContractorMutation,
  useUpdateContractorMutation,
  useDeleteContractorMutation,
  Contractor,
} from "@/lib/features/contractor-management/contractorManagementApi";
import { useAuth } from "@/hooks/useAuth";

interface ContractorFormData {
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  rate: string;
  language: string;
  type: string;
}

type ViewMode = 'list' | 'add' | 'edit';

export default function ContractorEditorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState<ContractorFormData>({
    firstName: '',
    lastName: '',
    email: '',
    code: '',
    rate: '0.00',
    language: 'en',
    type: 'contractor'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auth and Redux hooks
  const { isForeman } = useAuth();
  const { data: contractorsData, isLoading } = useGetCompanyContractorsQuery(undefined, {
    skip: !isForeman
  });
  const [createContractor, { isLoading: isCreating }] = useCreateContractorMutation();
  const [updateContractor, { isLoading: isUpdating }] = useUpdateContractorMutation();
  const [deleteContractor, { isLoading: isDeleting }] = useDeleteContractorMutation();

  // Redirect if not foreman
  if (!isForeman) {
    router.push('/contractor-forms');
    return null;
  }

  const allContractors = contractorsData?.contractors || [];
  
  // Apply type filter
  const contractors = typeFilter === "all" 
    ? allContractors 
    : allContractors.filter(contractor => {
        const contractorType = contractor.type || 'contractor';
        return contractorType === typeFilter;
      });

  const isFormLoading = isCreating || isUpdating;

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Code ${text} copied to clipboard`, 'success');
    } catch (err) {
      console.error('Failed to copy: ', err);
      showToast('Failed to copy code', 'error');
    }
  };

  const generateCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 6; i++) {
      randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setFormData(prev => ({ ...prev, code: randomCode }));
    
    if (formErrors.code) {
      setFormErrors(prev => ({ ...prev, code: "" }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Valid email is required';
    }
    if (!formData.code.trim()) {
      errors.code = 'Login code is required';
    } else if (formData.code.trim().length < 2) {
      errors.code = 'Code must be at least 2 characters';
    }

    if (formData.rate && formData.rate.trim()) {
      const rateValue = parseFloat(formData.rate);
      if (isNaN(rateValue) || rateValue < 0) {
        errors.rate = 'Rate must be a valid positive number';
      } else if (rateValue > 9999.99) {
        errors.rate = 'Rate cannot exceed $9999.99';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleAdd = () => {
    setEditingContractor(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      code: '',
      rate: '0.00',
      language: 'en',
      type: 'contractor'
    });
    setFormErrors({});
    setViewMode('add');
  };

  const handleCloseAddSheet = () => {
    setViewMode('list');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      code: '',
      rate: '0.00',
      language: 'en',
      type: 'contractor'
    });
    setFormErrors({});
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      firstName: contractor.firstName,
      lastName: contractor.lastName,
      email: contractor.email,
      code: contractor.code,
      rate: contractor.rate || '0.00',
      language: contractor.language || 'en',
      type: contractor.type || 'contractor'
    });
    setFormErrors({});
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingContractor(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      code: '',
      rate: '0.00',
      language: 'en',
      type: 'contractor'
    });
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingContractor) {
        await updateContractor({
          id: editingContractor.id,
          ...formData
        }).unwrap();
        showToast('Contractor updated successfully', 'success');
      } else {
        await createContractor(formData).unwrap();
        showToast('Contractor created successfully', 'success');
      }
      if (editingContractor) {
        setViewMode('list');
        handleCancel();
      } else {
        handleCloseAddSheet();
      }
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to save contractor', 'error');
    }
  };

  const handleDelete = async (contractorId: string) => {
    try {
      await deleteContractor(contractorId).unwrap();
      showToast('Contractor deleted successfully', 'success');
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to delete contractor', 'error');
    }
  };

  // Define table columns
  const columns: ColumnDef<Contractor>[] = [
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          First Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "lastName", 
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Last Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const code = getValue() as string;
        return (
          <Badge 
            variant="secondary" 
            className="cursor-pointer hover:bg-secondary/80 transition-colors inline-flex items-center gap-1 w-fit"
            onClick={() => copyToClipboard(code)}
            title="Click to copy code"
          >
            {code}
            <Copy className="h-3 w-3" />
          </Badge>
        );
      },
    },
    {
      accessorKey: "rate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const rate = getValue() as string | null;
        const rateValue = rate ? parseFloat(rate) : 0;
        return `$${rateValue.toFixed(2)}/hr`;
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const type = getValue() as string | null;
        return (
          <Badge 
            variant={type === 'foreman' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {type === 'foreman' ? 'Foreman' : 'Contractor'}
          </Badge>
        );
      },
    },
    {
      accessorKey: "language",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Language
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const language = getValue() as string | null;
        const getLanguageDisplay = (lang: string | null) => {
          switch (lang) {
            case 'es': return 'Español';
            case 'pl': return 'Polski';
            case 'zh': return '中文';
            default: return 'English';
          }
        };
        return (
          <div className="text-sm">
            {getLanguageDisplay(language)}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleDateString();
      },
    },
  ];

  // Form component that can be used in both sheet and full page
  const renderFormFields = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={formErrors.firstName ? "border-red-500" : ""}
            disabled={isFormLoading}
            required
          />
          {formErrors.firstName && (
            <p className="text-sm text-red-500">{formErrors.firstName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={formErrors.lastName ? "border-red-500" : ""}
            disabled={isFormLoading}
            required
          />
          {formErrors.lastName && (
            <p className="text-sm text-red-500">{formErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          className={formErrors.email ? "border-red-500" : ""}
          disabled={isFormLoading}
          required
        />
        {formErrors.email && (
          <p className="text-sm text-red-500">{formErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Login Code *</Label>
        <div className="flex space-x-2">
          <Input
            id="code"
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            placeholder="Enter unique login code"
            className={formErrors.code ? "border-red-500" : ""}
            disabled={isFormLoading}
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={generateCode}
            disabled={isFormLoading}
            className="flex items-center space-x-1 whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Generate</span>
          </Button>
        </div>
        {formErrors.code && (
          <p className="text-sm text-red-500">{formErrors.code}</p>
        )}
        <p className="text-xs text-muted-foreground">
          This code will be used by the contractor to log in to the system
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate">Hourly Rate</Label>
        <Input
          id="rate"
          name="rate"
          type="number"
          step="0.01"
          min="0"
          max="9999.99"
          value={formData.rate}
          onChange={handleInputChange}
          placeholder="0.00"
          className={formErrors.rate ? "border-red-500" : ""}
          disabled={isFormLoading}
        />
        {formErrors.rate && (
          <p className="text-sm text-red-500">{formErrors.rate}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="language">Language Preference</Label>
          <Select
            value={formData.language}
            onValueChange={(value) => handleSelectChange('language', value)}
            disabled={isFormLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="pl">Polski</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleSelectChange('type', value)}
            disabled={isFormLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="foreman">Foreman</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button
          type="submit"
          disabled={isFormLoading}
          className="flex items-center space-x-2 flex-1"
        >
          <Save className="h-4 w-4" />
          <span>{isFormLoading ? (editingContractor ? 'Updating...' : 'Creating...') : (editingContractor ? 'Update Contractor' : 'Create Contractor')}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={editingContractor ? handleCancel : handleCloseAddSheet}
          disabled={isFormLoading}
          className="flex items-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </Button>
      </div>
    </form>
  );

  // Render edit form view (full page for edit only)
  const renderEditFormView = () => (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="ghost" onClick={handleCancel} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Contractors</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Edit Contractor</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contractor Information</CardTitle>
        </CardHeader>
        <CardContent>
          {renderFormFields()}
        </CardContent>
      </Card>
    </div>
  );

  // Render list view
  const renderListView = () => (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Contractor Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
              Manage contractors in your subcontractor company
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleAdd} 
              className="flex items-center justify-center space-x-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contractor</span>
            </Button>
          </div>
        </div>
      </div>

      <AdminDataTable
        filters={
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <div className="text-xs font-medium">Type</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-28 justify-between text-xs">
                    <span className="truncate">
                      {typeFilter === "all" ? "All Types" : 
                       typeFilter === "contractor" ? "Contractors" : 
                       typeFilter === "foreman" ? "Foremen" : "All Types"}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("contractor")}>
                    Contractors
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("foreman")}>
                    Foremen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {typeFilter !== "all" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTypeFilter("all")}
                className="gap-1 text-xs"
              >
                <X className="h-3 w-3" />
                Clear Filter
              </Button>
            )}
          </div>
        }
        data={contractors}
        columns={columns}
        isLoading={isLoading}
        isFetching={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getRowId={(contractor) => contractor.id}
        exportFilename="contractors"
        exportHeaders={['First Name', 'Last Name', 'Email', 'Code', 'Rate', 'Company', 'Type', 'Language', 'Created']}
        getExportData={(contractor) => [
          contractor.firstName,
          contractor.lastName,
          contractor.email,
          contractor.code,
          `$${(contractor.rate ? parseFloat(contractor.rate) : 0).toFixed(2)}/hr`,
          contractor.companyName || "",
          contractor.type === 'foreman' ? 'Foreman' : 'Contractor',
          contractor.language === 'es' ? 'Español' :
          contractor.language === 'pl' ? 'Polski' :
          contractor.language === 'zh' ? '中文' : 'English',
          new Date(contractor.createdAt).toLocaleDateString()
        ]}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-4 md:p-6">
        {viewMode === 'edit' ? renderEditFormView() : renderListView()}
        
        {/* Add Contractor Sheet */}
        <Sheet open={viewMode === 'add'} onOpenChange={handleCloseAddSheet}>
          <SheetContent side="right" className="w-[400px] sm:w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Contractor</SheetTitle>
              <SheetDescription>
                Add a new contractor to your subcontractor company.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {renderFormFields()}
            </div>
          </SheetContent>
        </Sheet>
        
        <Toast
          message={toast.message}
          type={toast.type}
          show={toast.show}
          onClose={hideToast}
        />
      </main>
    </div>
  );
}