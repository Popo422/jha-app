"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetContractorsQuery, useDeleteContractorMutation, useCreateContractorMutation, useUpdateContractorMutation, type Contractor } from "@/lib/features/contractors/contractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { Plus, Edit, Save, X, ArrowLeft, RefreshCw, Mail, ArrowUpDown, Copy } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

type ViewMode = 'list' | 'add' | 'edit';

export default function ContractorsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    code: "",
    rate: "",
    companyName: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string>("");
  
  const { toast, showToast, hideToast } = useToast();
  
  const { data: contractorsData, isLoading, error, refetch } = useGetContractorsQuery({
    search: debouncedSearch || undefined,
  });
  
  const [deleteContractor, { isLoading: isDeleting }] = useDeleteContractorMutation();
  const [createContractor, { isLoading: isCreating, error: createError }] = useCreateContractorMutation();
  const [updateContractor, { isLoading: isUpdating, error: updateError }] = useUpdateContractorMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Code "${text}" copied to clipboard!`, 'success');
    } catch (err) {
      console.error('Failed to copy: ', err);
      showToast('Failed to copy code', 'error');
    }
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      firstName: contractor.firstName,
      lastName: contractor.lastName,
      email: contractor.email,
      code: contractor.code,
      rate: contractor.rate || "0.00",
      companyName: contractor.companyName || "",
    });
    setFormErrors({});
    setEmailMessage("");
    setViewMode('edit');
  };

  const handleAdd = () => {
    setEditingContractor(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      code: "",
      rate: "0.00",
      companyName: "",
    });
    setFormErrors({});
    setEmailMessage("");
    setViewMode('add');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingContractor(null);
    setFormData({ firstName: "", lastName: "", email: "", code: "", rate: "", companyName: "" });
    setFormErrors({});
    setEmailMessage("");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.code.trim()) {
      errors.code = "Contractor code is required";
    } else if (formData.code.trim().length < 2) {
      errors.code = "Contractor code must be at least 2 characters";
    }

    if (formData.rate && formData.rate.trim()) {
      const rateValue = parseFloat(formData.rate);
      if (isNaN(rateValue) || rateValue < 0) {
        errors.rate = "Rate must be a valid positive number";
      } else if (rateValue > 9999.99) {
        errors.rate = "Rate cannot exceed $9,999.99";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
          ...formData,
        }).unwrap();
      } else {
        await createContractor(formData).unwrap();
      }
      setViewMode('list');
      setEditingContractor(null);
      setFormData({ firstName: "", lastName: "", email: "", code: "", rate: "", companyName: "" });
    } catch (error) {
      console.error('Failed to save contractor:', error);
    }
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

  const handleDelete = async (contractorId: string) => {
    try {
      await deleteContractor(contractorId).unwrap();
    } catch (error) {
      console.error('Failed to delete contractor:', error);
    }
  };

  const generateCode = () => {
    // Generate completely random alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 6; i++) {
      randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setFormData(prev => ({ ...prev, code: randomCode }));
    
    // Clear any existing error for the code field
    if (formErrors.code) {
      setFormErrors(prev => ({ ...prev, code: "" }));
    }
  };

  const handleSendCodeEmail = async () => {
    if (!editingContractor?.id) return;

    setIsSendingEmail(true);
    setEmailMessage("");

    try {
      const response = await fetch('/api/email/send-code-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractorId: editingContractor.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setEmailMessage("✅ Code update email sent successfully!");
      } else {
        setEmailMessage(`❌ Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending code update email:', error);
      setEmailMessage("❌ Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getErrorMessage = () => {
    if (formError && 'data' in formError && typeof formError.data === 'object' && formError.data && 'error' in formError.data) {
      return (formError.data as any).error;
    }
    return 'An error occurred while saving the contractor';
  };

  const contractors = contractorsData?.contractors || [];

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
      accessorKey: "companyName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Company Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const companyName = getValue() as string | null;
        return (
          <div className="text-sm text-gray-600">
            {companyName || ""}
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

  // Render form view (add/edit)
  const renderFormView = () => (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="ghost" onClick={handleCancel} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Contractors</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {viewMode === 'add' ? 'Add New Contractor' : 'Edit Contractor'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contractor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={formErrors.firstName ? "border-red-500" : ""}
                  disabled={isFormLoading}
                />
                {formErrors.firstName && (
                  <p className="text-sm text-red-500">{formErrors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={formErrors.lastName ? "border-red-500" : ""}
                  disabled={isFormLoading}
                />
                {formErrors.lastName && (
                  <p className="text-sm text-red-500">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={formErrors.email ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Contractor Code</Label>
              <div className="flex space-x-2">
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g., CONT001"
                  className={formErrors.code ? "border-red-500" : ""}
                  disabled={isFormLoading}
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
                This code will be used for contractor login. Click Generate to auto-create a unique code.
              </p>
              {viewMode === 'edit' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendCodeEmail}
                  disabled={isSendingEmail || isFormLoading || true}
                  className="mt-2 flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>{isSendingEmail ? 'Sending...' : 'Send Updated Code Email'}</span>
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                max="9999.99"
                value={formData.rate}
                onChange={handleInputChange}
                placeholder="e.g., 25.00"
                className={formErrors.rate ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.rate && (
                <p className="text-sm text-red-500">{formErrors.rate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="e.g., ABC Construction"
                className={formErrors.companyName ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.companyName && (
                <p className="text-sm text-red-500">{formErrors.companyName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional company name for this contractor. If not provided, will use the parent company name.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {getErrorMessage()}
              </div>
            )}

            {emailMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                emailMessage.includes('✅') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {emailMessage}
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <Button
                type="submit"
                disabled={isFormLoading}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isFormLoading ? 'Saving...' : (viewMode === 'add' ? 'Add Contractor' : 'Update Contractor')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isFormLoading}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </form>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Contractors</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
              Manage contractor accounts and access codes
            </p>
          </div>
          <Button onClick={handleAdd} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Contractor</span>
          </Button>
        </div>
      </div>

      <AdminDataTable
        data={contractors}
        columns={columns}
        isLoading={isLoading}
        isFetching={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getRowId={(contractor) => contractor.id}
        exportFilename="contractors"
        exportHeaders={["First Name", "Last Name", "Email", "Code", "Rate", "Company Name", "Created"]}
        getExportData={(contractor) => [
          contractor.firstName,
          contractor.lastName,
          contractor.email,
          contractor.code,
          `$${(contractor.rate ? parseFloat(contractor.rate) : 0).toFixed(2)}/hr`,
          contractor.companyName || "",
          new Date(contractor.createdAt).toLocaleDateString()
        ]}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      {viewMode === 'list' ? renderListView() : renderFormView()}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}