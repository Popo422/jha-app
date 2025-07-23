"use client";

import { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetContractorsQuery, useDeleteContractorMutation, useCreateContractorMutation, useUpdateContractorMutation, useGetContractorLimitQuery, type Contractor } from "@/lib/features/contractors/contractorsApi";
import { useContractorExportAll } from "@/hooks/useExportAll";
import { useCreateSubcontractorMutation } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SubcontractorSelect from "@/components/SubcontractorSelect";
import { Plus, Edit, Save, X, ArrowLeft, RefreshCw, Mail, ArrowUpDown, Copy } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

type ViewMode = 'list' | 'add' | 'edit';

export default function ContractorsPage() {
  const { t } = useTranslation('common');
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
    language: "en",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [isSubcontractorModalOpen, setIsSubcontractorModalOpen] = useState(false);
  const [newSubcontractorName, setNewSubcontractorName] = useState("");
  
  const { toast, showToast, hideToast } = useToast();
  
  const { data: contractorsData, isLoading, error, refetch } = useGetContractorsQuery({
    search: debouncedSearch || undefined,
  });

  const { data: limitData } = useGetContractorLimitQuery();
  
  const [deleteContractor, { isLoading: isDeleting }] = useDeleteContractorMutation();
  const exportAllContractors = useContractorExportAll();
  const [createContractor, { isLoading: isCreating, error: createError }] = useCreateContractorMutation();
  const [updateContractor, { isLoading: isUpdating, error: updateError }] = useUpdateContractorMutation();
  const [createSubcontractor, { isLoading: isCreatingSubcontractor }] = useCreateSubcontractorMutation();

  // Function to fetch all contractors for export
  const handleExportAll = useCallback(async () => {
    return await exportAllContractors({
      search: debouncedSearch || undefined,
    });
  }, [exportAllContractors, debouncedSearch]);

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('contractors.codeCopiedToClipboard').replace('{{code}}', text), 'success');
    } catch (err) {
      console.error('Failed to copy: ', err);
      showToast(t('contractors.failedToCopyCode'), 'error');
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
      language: contractor.language || "en",
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
      language: "en",
    });
    setFormErrors({});
    setEmailMessage("");
    setViewMode('add');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingContractor(null);
    setFormData({ firstName: "", lastName: "", email: "", code: "", rate: "", companyName: "", language: "en" });
    setFormErrors({});
    setEmailMessage("");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = t('contractors.firstNameRequired');
    }
    if (!formData.lastName.trim()) {
      errors.lastName = t('contractors.lastNameRequired');
    }
    if (!formData.email.trim()) {
      errors.email = t('contractors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('contractors.validEmailRequired');
    }
    if (!formData.code.trim()) {
      errors.code = t('contractors.contractorCodeRequired');
    } else if (formData.code.trim().length < 2) {
      errors.code = t('contractors.contractorCodeMinLength');
    }

    if (formData.rate && formData.rate.trim()) {
      const rateValue = parseFloat(formData.rate);
      if (isNaN(rateValue) || rateValue < 0) {
        errors.rate = t('contractors.rateValidPositiveNumber');
      } else if (rateValue > 9999.99) {
        errors.rate = t('contractors.rateMaxValue');
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
      setFormData({ firstName: "", lastName: "", email: "", code: "", rate: "", companyName: "", language: "en" });
    } catch (error: any) {
      console.error('Failed to save contractor:', error);
      
      // Handle contractor limit exceeded error
      if (error?.data?.error === 'Contractor limit exceeded') {
        showToast(
          `${t('contractors.contractorLimitExceeded')}: ${error.data.message}`,
          'error'
        );
      } else if (error?.data?.error) {
        showToast(error.data.error, 'error');
      } else {
        showToast('Failed to save contractor', 'error');
      }
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
        setEmailMessage(`✅ ${t('contractors.codeUpdateEmailSentSuccessfully')}`);
      } else {
        setEmailMessage(`❌ ${t('contractors.failedToSendEmail')}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending code update email:', error);
      setEmailMessage(`❌ ${t('contractors.failedToSendEmailTryAgain')}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getErrorMessage = () => {
    if (formError && 'data' in formError && typeof formError.data === 'object' && formError.data && 'error' in formError.data) {
      return (formError.data as any).error;
    }
    return t('contractors.errorSavingContractor');
  };

  const handleCreateSubcontractor = async () => {
    if (!newSubcontractorName.trim()) return;

    try {
      const result = await createSubcontractor({
        name: newSubcontractorName.trim()
      }).unwrap();
      
      // Auto-select the new subcontractor in the form
      setFormData(prev => ({ ...prev, companyName: result.subcontractor.name }));
      
      // Close modal and reset
      setIsSubcontractorModalOpen(false);
      setNewSubcontractorName("");
      
      showToast('Company/Subcontractor created successfully', 'success');
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to create company/subcontractor', 'error');
    }
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
{t('contractors.firstName')}
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
{t('contractors.lastName')}
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
{t('auth.email')}
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
{t('contractors.code')}
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
            title={t('contractors.clickToCopyCode')}
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
{t('contractors.rate')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const rate = getValue() as string | null;
        const rateValue = rate ? parseFloat(rate) : 0;
        return `$${rateValue.toFixed(2)}${t('contractors.perHour')}`;
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
{t('contractors.companySubcontractor')}
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
{t('contractors.created')}
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
            <span>{t('contractors.backToContractors')}</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {viewMode === 'add' ? t('contractors.addNewContractor') : t('contractors.editContractor')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('contractors.contractorInformation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('contractors.firstName')}</Label>
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
                <Label htmlFor="lastName">{t('contractors.lastName')}</Label>
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
              <Label htmlFor="email">{t('contractors.emailAddress')}</Label>
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
              <Label htmlFor="code">{t('contractors.contractorCode')}</Label>
              <div className="flex space-x-2">
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder={t('contractors.contractorCodePlaceholder')}
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
                  <span>{t('contractors.generate')}</span>
                </Button>
              </div>
              {formErrors.code && (
                <p className="text-sm text-red-500">{formErrors.code}</p>
              )}
              <p className="text-xs text-muted-foreground">
{t('contractors.contractorCodeHelp')}
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
                  <span>{isSendingEmail ? t('contractors.sending') : t('contractors.sendUpdatedCodeEmail')}</span>
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">{t('contractors.hourlyRate')}</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                max="9999.99"
                value={formData.rate}
                onChange={handleInputChange}
                placeholder={t('contractors.hourlyRatePlaceholder')}
                className={formErrors.rate ? "border-red-500" : ""}
                disabled={isFormLoading}
              />
              {formErrors.rate && (
                <p className="text-sm text-red-500">{formErrors.rate}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <SubcontractorSelect
                    id="companyName"
                    name="companyName"
                    label={t('contractors.companySubcontractor')}
                    value={formData.companyName}
                    onChange={(value) => setFormData(prev => ({ ...prev, companyName: value }))}
                    placeholder={t('contractors.companyNamePlaceholder')}
                    disabled={isFormLoading}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => setIsSubcontractorModalOpen(true)}
                    disabled={isFormLoading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {formErrors.companyName && (
                <p className="text-sm text-red-500">{formErrors.companyName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: Select or enter a company/subcontractor name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language Preference</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isFormLoading}
                    className="w-full justify-between"
                  >
                    {formData.language === 'en' ? 'English' : 
                     formData.language === 'es' ? 'Español' :
                     formData.language === 'pl' ? 'Polski' :
                     formData.language === 'zh' ? '中文' : 'English'}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem
                    onClick={() => setFormData(prev => ({ ...prev, language: 'en' }))}
                  >
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFormData(prev => ({ ...prev, language: 'es' }))}
                  >
                    Español
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFormData(prev => ({ ...prev, language: 'pl' }))}
                  >
                    Polski
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFormData(prev => ({ ...prev, language: 'zh' }))}
                  >
                    中文
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground">
                {t('contractors.languagePreferenceHelp')}
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
                <span>{isFormLoading ? t('contractors.saving') : (viewMode === 'add' ? t('contractors.addContractor') : t('contractors.updateContractor'))}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isFormLoading}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>{t('contractors.cancel')}</span>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('contractors.contractors')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
{t('contractors.manageContractorAccounts')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {limitData && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {`${t('contractors.contractorsLimitRemaining')} ${limitData.limit - limitData.currentCount}`}
              </div>
            )}
            <Button onClick={handleAdd} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>{t('contractors.addContractor')}</span>
            </Button>
          </div>
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
        exportHeaders={[t('contractors.firstName'), t('contractors.lastName'), t('auth.email'), t('contractors.code'), t('contractors.rate'), t('contractors.companySubcontractor'), 'Language', t('contractors.created')]}
        getExportData={(contractor) => [
          contractor.firstName,
          contractor.lastName,
          contractor.email,
          contractor.code,
          `$${(contractor.rate ? parseFloat(contractor.rate) : 0).toFixed(2)}${t('contractors.perHour')}`,
          contractor.companyName || "",
          contractor.language === 'es' ? 'Español' :
          contractor.language === 'pl' ? 'Polski' :
          contractor.language === 'zh' ? '中文' : 'English',
          new Date(contractor.createdAt).toLocaleDateString()
        ]}
        searchValue={search}
        onSearchChange={setSearch}
        onExportAll={handleExportAll}
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

      {/* Add Subcontractor Modal */}
      <AlertDialog open={isSubcontractorModalOpen} onOpenChange={setIsSubcontractorModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New {t('contractors.companySubcontractor')}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the company/subcontractor name below. It will be automatically selected in the form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subcontractor-name">{t('contractors.companySubcontractor')} Name</Label>
              <Input
                id="subcontractor-name"
                value={newSubcontractorName}
                onChange={(e) => setNewSubcontractorName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsSubcontractorModalOpen(false);
              setNewSubcontractorName("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateSubcontractor} 
              disabled={isCreatingSubcontractor || !newSubcontractorName.trim()}
            >
              {isCreatingSubcontractor ? 'Creating...' : 'Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}