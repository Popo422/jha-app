"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubcontractorsQuery, useDeleteSubcontractorMutation, useCreateSubcontractorMutation, useUpdateSubcontractorMutation, type Subcontractor } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectSubcontractorsBulkUploadModal } from "@/components/admin/ProjectSubcontractorsBulkUploadModal";
import { Plus, ArrowUpDown, Upload, ChevronDown, Save, X, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { TRADE_OPTIONS } from "@/lib/constants/trades";

type ViewMode = 'list' | 'add' | 'edit';

interface ProjectSubcontractorsProps {
  projectId: string;
}

export default function ProjectSubcontractors({ projectId }: ProjectSubcontractorsProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contractAmount: "",
    foreman: "",
    foremanEmail: "",
    address: "",
    contact: "",
    email: "",
    phone: "",
    trade: "",
    contractorLicenseNo: "",
    specialtyLicenseNo: "",
    federalTaxId: "",
    motorCarrierPermitNo: "",
    isUnion: false,
    isSelfInsured: false,
    workersCompPolicy: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  
  const { showToast } = useToast();
  
  const { data: subcontractorsData, isLoading, isFetching, refetch } = useGetSubcontractorsQuery({
    search: debouncedSearch || undefined,
    projectId: projectId,
    page: 1,
    pageSize: 100,
    authType: 'admin'
  });
  
  const [deleteSubcontractor, { isLoading: isDeleting }] = useDeleteSubcontractorMutation();
  const [createSubcontractor, { isLoading: isCreating, error: createError }] = useCreateSubcontractorMutation();
  const [updateSubcontractor, { isLoading: isUpdating, error: updateError }] = useUpdateSubcontractorMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const allSubcontractors = subcontractorsData?.subcontractors || [];

  const handleEdit = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setFormData({
      name: subcontractor.name,
      contractAmount: subcontractor.contractAmount || "",
      foreman: subcontractor.foreman || "",
      foremanEmail: (subcontractor as any).foremanEmail || "",
      address: subcontractor.address || "",
      contact: subcontractor.contact || "",
      email: subcontractor.email || "",
      phone: subcontractor.phone || "",
      trade: subcontractor.trade || "",
      contractorLicenseNo: subcontractor.contractorLicenseNo || "",
      specialtyLicenseNo: subcontractor.specialtyLicenseNo || "",
      federalTaxId: subcontractor.federalTaxId || "",
      motorCarrierPermitNo: subcontractor.motorCarrierPermitNo || "",
      isUnion: subcontractor.isUnion || false,
      isSelfInsured: subcontractor.isSelfInsured || false,
      workersCompPolicy: subcontractor.workersCompPolicy || "",
    });
    setFormErrors({});
    setViewMode('edit');
  };

  const handleAdd = () => {
    setEditingSubcontractor(null);
    setFormData({
      name: "",
      contractAmount: "",
      foreman: "",
      foremanEmail: "",
      address: "",
      contact: "",
      email: "",
      phone: "",
      trade: "",
      contractorLicenseNo: "",
      specialtyLicenseNo: "",
      federalTaxId: "",
      motorCarrierPermitNo: "",
      isUnion: false,
      isSelfInsured: false,
      workersCompPolicy: "",
    });
    setFormErrors({});
    setViewMode('add');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingSubcontractor(null);
    setFormData({ 
      name: "", 
      contractAmount: "", 
      foreman: "", 
      foremanEmail: "", 
      address: "", 
      contact: "", 
      email: "", 
      phone: "",
      trade: "",
      contractorLicenseNo: "",
      specialtyLicenseNo: "",
      federalTaxId: "",
      motorCarrierPermitNo: "",
      isUnion: false,
      isSelfInsured: false,
      workersCompPolicy: "",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Subcontractor name is required';
    }

    // Validate foreman email if provided (optional)
    if (formData.foremanEmail && formData.foremanEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.foremanEmail)) {
        errors.foremanEmail = 'Please enter a valid email address for the foreman';
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
      if (editingSubcontractor) {
        // For updates, preserve existing project assignments and ensure this project is included
        const existingProjectIds = (editingSubcontractor as any).projectIds || [];
        const updatedProjectIds = [...new Set([...existingProjectIds, projectId])];
        
        await updateSubcontractor({
          id: editingSubcontractor.id,
          ...formData,
          projectIds: updatedProjectIds,
        }).unwrap();
        showToast('Subcontractor updated successfully', 'success');
      } else {
        // For new subcontractors, assign only to this project
        await createSubcontractor({
          ...formData,
          projectIds: [projectId],
        }).unwrap();
        showToast('Subcontractor created successfully', 'success');
      }
      
      setViewMode('list');
      setEditingSubcontractor(null);
      setFormData({ 
        name: "", 
        contractAmount: "", 
        foreman: "", 
        foremanEmail: "", 
        address: "", 
        contact: "", 
        email: "", 
        phone: "",
        trade: "",
        contractorLicenseNo: "",
        specialtyLicenseNo: "",
        federalTaxId: "",
        motorCarrierPermitNo: "",
        isUnion: false,
        isSelfInsured: false,
        workersCompPolicy: "",
      });
      refetch();
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to save subcontractor', 'error');
    }
  };

  const handleDelete = async (subcontractorId: string) => {
    const subcontractor = allSubcontractors.find(s => s.id === subcontractorId);
    if (!subcontractor) return;

    if (!confirm(`Are you sure you want to delete "${subcontractor.name}"?`)) {
      return;
    }

    try {
      await deleteSubcontractor(subcontractorId).unwrap();
      showToast('Subcontractor deleted successfully', 'success');
      refetch();
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to delete subcontractor', 'error');
    }
  };

  // Define table columns
  const columns: ColumnDef<Subcontractor>[] = [
    {
      accessorKey: "name",
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
    },
    {
      accessorKey: "contractAmount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Contract Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("contractAmount") as string | null;
        return amount ? `$${parseFloat(amount).toLocaleString()}` : "-";
      },
    },
    {
      accessorKey: "foreman",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Foreman
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const foreman = row.getValue("foreman") as string | null;
        return foreman ? (
          <span className="text-sm">{foreman}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "trade",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Trade
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.getValue("trade") as string | null;
        return trade ? (
          <span className="text-sm">{trade}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "isUnion",
      header: "Union Status",
      cell: ({ row }) => {
        const isUnion = row.getValue("isUnion") as boolean;
        return (
          <span className={`text-xs px-2 py-1 rounded-full ${
            isUnion 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isUnion ? 'Union' : 'Non-Union'}
          </span>
        );
      },
    },
  ];

  // Render form view (add/edit)
  const renderFormView = () => (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Subcontractors</span>
            </Button>
          </div>
          <CardTitle>
            {viewMode === 'add' ? 'Add New Subcontractor' : 'Edit Subcontractor'}
          </CardTitle>
          <CardDescription>
            {viewMode === 'add' 
              ? 'Create a new subcontractor for this project.'
              : 'Update the subcontractor information.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('contractors.companySubcontractor')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className={formErrors.name ? "border-red-500" : ""}
                  disabled={isFormLoading}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractAmount">Contract Amount (Optional)</Label>
                  <Input
                    id="contractAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.contractAmount}
                    onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                    placeholder="Enter contract amount"
                    disabled={isFormLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foreman">Foreman (Optional)</Label>
                  <Input
                    id="foreman"
                    value={formData.foreman}
                    onChange={(e) => setFormData({ ...formData, foreman: e.target.value })}
                    placeholder="Enter foreman name"
                    className={formErrors.foreman ? "border-red-500" : ""}
                    disabled={isFormLoading}
                  />
                  {formErrors.foreman && (
                    <p className="text-sm text-red-500">{formErrors.foreman}</p>
                  )}
                </div>
              </div>
              
              {formData.foreman && formData.foreman.trim() && (
                <div>
                  <Label htmlFor="foremanEmail">Foreman Email (Optional)</Label>
                  <Input
                    id="foremanEmail"
                    type="email"
                    value={formData.foremanEmail}
                    onChange={(e) => setFormData({ ...formData, foremanEmail: e.target.value })}
                    placeholder="Enter foreman email address"
                    className={formErrors.foremanEmail ? "border-red-500" : ""}
                    disabled={isFormLoading}
                  />
                  {formErrors.foremanEmail && (
                    <p className="text-sm text-red-500">{formErrors.foremanEmail}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    If no email provided, a default email will be generated. Adding a foreman will automatically create a contractor account.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  disabled={isFormLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Person (Optional)</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Enter contact person"
                    disabled={isFormLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isFormLoading}
                />
              </div>

              {/* Trade and License Information */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm text-gray-900">Business Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trade">Trade/Specialty (Optional)</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={isFormLoading}
                          className="w-full justify-between"
                        >
                          {formData.trade || "Select trade"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                        <DropdownMenuItem onClick={() => setFormData(prev => ({ ...prev, trade: '' }))}>
                          Not specified
                        </DropdownMenuItem>
                        {TRADE_OPTIONS.map((trade) => (
                          <DropdownMenuItem 
                            key={trade}
                            onClick={() => setFormData(prev => ({ ...prev, trade }))}
                          >
                            {trade}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractorLicenseNo">Contractor License # (Optional)</Label>
                    <Input
                      id="contractorLicenseNo"
                      value={formData.contractorLicenseNo}
                      onChange={(e) => setFormData({ ...formData, contractorLicenseNo: e.target.value })}
                      placeholder="Enter license number"
                      disabled={isFormLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialtyLicenseNo">Specialty License # (Optional)</Label>
                    <Input
                      id="specialtyLicenseNo"
                      value={formData.specialtyLicenseNo}
                      onChange={(e) => setFormData({ ...formData, specialtyLicenseNo: e.target.value })}
                      placeholder="Enter specialty license number"
                      disabled={isFormLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="federalTaxId">Federal Tax ID (Optional)</Label>
                    <Input
                      id="federalTaxId"
                      value={formData.federalTaxId}
                      onChange={(e) => setFormData({ ...formData, federalTaxId: e.target.value })}
                      placeholder="Enter federal tax ID"
                      disabled={isFormLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motorCarrierPermitNo">Motor Carrier Permit # (Optional)</Label>
                    <Input
                      id="motorCarrierPermitNo"
                      value={formData.motorCarrierPermitNo}
                      onChange={(e) => setFormData({ ...formData, motorCarrierPermitNo: e.target.value })}
                      placeholder="Enter motor carrier permit number"
                      disabled={isFormLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workersCompPolicy">Workers' Comp Policy # (Optional)</Label>
                    <Input
                      id="workersCompPolicy"
                      value={formData.workersCompPolicy}
                      onChange={(e) => setFormData({ ...formData, workersCompPolicy: e.target.value })}
                      placeholder="Enter policy number"
                      disabled={isFormLoading}
                    />
                  </div>
                </div>

                {/* Boolean flags */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isUnion"
                      checked={formData.isUnion}
                      onCheckedChange={(checked) => setFormData({ ...formData, isUnion: checked === true })}
                      disabled={isFormLoading}
                    />
                    <Label htmlFor="isUnion" className="text-sm font-normal">
                      Union contractor
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isSelfInsured"
                      checked={formData.isSelfInsured}
                      onCheckedChange={(checked) => setFormData({ ...formData, isSelfInsured: checked === true })}
                      disabled={isFormLoading}
                    />
                    <Label htmlFor="isSelfInsured" className="text-sm font-normal">
                      Self-insured for workers' compensation
                    </Label>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {(formError as any)?.data?.error || 'An error occurred'}
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                type="submit"
                disabled={isFormLoading}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isFormLoading ? (viewMode === 'add' ? 'Creating...' : 'Updating...') : (viewMode === 'add' ? 'Create Subcontractor' : 'Update Subcontractor')}</span>
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
            <h3 className="text-lg font-semibold mb-2">Project Subcontractors</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage subcontractors assigned to this project
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsBulkUploadModalOpen(true)}
              variant="outline"
              className="flex items-center space-x-2"
              size="sm"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>
            <Button 
              onClick={handleAdd} 
              className="flex items-center space-x-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Subcontractor</span>
            </Button>
          </div>
        </div>
      </div>

      <AdminDataTable
        data={allSubcontractors}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getRowId={(subcontractor) => subcontractor.id}
        exportFilename="project-subcontractors"
        exportHeaders={[t('contractors.companySubcontractor'), 'Contract Amount', 'Foreman', 'Trade', 'Union Status', 'Self-Insured', 'Contractor License', 'Specialty License', 'Federal Tax ID', 'Motor Carrier Permit', 'Workers Comp Policy']}
        getExportData={(subcontractor) => [
          subcontractor.name,
          subcontractor.contractAmount ? `$${parseFloat(subcontractor.contractAmount).toLocaleString()}` : '',
          subcontractor.foreman || '',
          subcontractor.trade || '',
          subcontractor.isUnion ? 'Union' : 'Non-Union',
          subcontractor.isSelfInsured ? 'Yes' : 'No',
          subcontractor.contractorLicenseNo || '',
          subcontractor.specialtyLicenseNo || '',
          subcontractor.federalTaxId || '',
          subcontractor.motorCarrierPermitNo || '',
          subcontractor.workersCompPolicy || '',
        ]}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );

  return (
    <div>
      {viewMode === 'list' ? renderListView() : renderFormView()}

      <ProjectSubcontractorsBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        projectId={projectId}
        onUploadSuccess={() => refetch()}
      />
    </div>
  );
}