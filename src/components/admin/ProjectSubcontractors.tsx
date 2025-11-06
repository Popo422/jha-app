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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProjectSubcontractorsBulkUploadModal } from "@/components/admin/ProjectSubcontractorsBulkUploadModal";
import { Plus, ArrowUpDown, Upload } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface ProjectSubcontractorsProps {
  projectId: string;
}

export default function ProjectSubcontractors({ projectId }: ProjectSubcontractorsProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
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
    });
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingSubcontractor(null);
    setFormData({ name: "", contractAmount: "", foreman: "", foremanEmail: "", address: "", contact: "", email: "", phone: "" });
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
      handleCancel();
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
  ];

  return (
    <>
      {/* Create Subcontractor Dialog */}
      <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Subcontractor</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new subcontractor for this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('contractors.companySubcontractor')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="contractAmount">Contract Amount (Optional)</Label>
                <Input
                  id="contractAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.contractAmount}
                  onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                  placeholder="Enter contract amount"
                />
              </div>
              <div>
                <Label htmlFor="foreman">Foreman (Optional)</Label>
                <Input
                  id="foreman"
                  value={formData.foreman}
                  onChange={(e) => setFormData({ ...formData, foreman: e.target.value })}
                  placeholder="Enter foreman name"
                  className={formErrors.foreman ? "border-red-500" : ""}
                />
                {formErrors.foreman && (
                  <p className="text-sm text-red-500">{formErrors.foreman}</p>
                )}
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
                  <Label htmlFor="email-create">Email (Optional)</Label>
                  <Input
                    id="email-create"
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

              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">
                    {(formError as any)?.data?.error || 'An error occurred'}
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={isFormLoading}>
                {isFormLoading ? 'Creating...' : 'Create'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Subcontractor Dialog */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Subcontractor</AlertDialogTitle>
            <AlertDialogDescription>
              Update the subcontractor information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t('contractors.companySubcontractor')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-contractAmount">Contract Amount (Optional)</Label>
                <Input
                  id="edit-contractAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.contractAmount}
                  onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                  placeholder="Enter contract amount"
                />
              </div>
              <div>
                <Label htmlFor="edit-foreman">Foreman (Optional)</Label>
                <Input
                  id="edit-foreman"
                  value={formData.foreman}
                  onChange={(e) => setFormData({ ...formData, foreman: e.target.value })}
                  placeholder="Enter foreman name"
                  className={formErrors.foreman ? "border-red-500" : ""}
                />
                {formErrors.foreman && (
                  <p className="text-sm text-red-500">{formErrors.foreman}</p>
                )}
              </div>
              
              {formData.foreman && formData.foreman.trim() && (
                <div>
                  <Label htmlFor="edit-foremanEmail">Foreman Email (Optional)</Label>
                  <Input
                    id="edit-foremanEmail"
                    type="email"
                    value={formData.foremanEmail}
                    onChange={(e) => setFormData({ ...formData, foremanEmail: e.target.value })}
                    placeholder="Enter foreman email address"
                    className={formErrors.foremanEmail ? "border-red-500" : ""}
                  />
                  {formErrors.foremanEmail && (
                    <p className="text-sm text-red-500">{formErrors.foremanEmail}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    If no email provided, a default email will be generated. Adding/updating a foreman will create a contractor account.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address (Optional)</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  disabled={isFormLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact">Contact Person (Optional)</Label>
                  <Input
                    id="edit-contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Enter contact person"
                    disabled={isFormLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email (Optional)</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone (Optional)</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isFormLoading}
                />
              </div>

              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">
                    {(formError as any)?.data?.error || 'An error occurred'}
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={isFormLoading}>
                {isFormLoading ? 'Updating...' : 'Update'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
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
          exportHeaders={[t('contractors.companySubcontractor'), 'Contract Amount', 'Foreman']}
          getExportData={(subcontractor) => [
            subcontractor.name,
            subcontractor.contractAmount ? `$${parseFloat(subcontractor.contractAmount).toLocaleString()}` : '',
            subcontractor.foreman || '',
          ]}
          searchValue={search}
          onSearchChange={setSearch}
        />
      </div>

      <ProjectSubcontractorsBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        projectId={projectId}
        onUploadSuccess={() => refetch()}
      />
    </>
  );
}