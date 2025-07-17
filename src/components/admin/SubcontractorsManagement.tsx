"use client";

import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubcontractorsQuery, useDeleteSubcontractorMutation, useCreateSubcontractorMutation, useUpdateSubcontractorMutation, type Subcontractor } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowUpDown, Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export function SubcontractorsManagement() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const { showToast } = useToast();
  
  const { data: subcontractorsData, isLoading, error, refetch } = useGetSubcontractorsQuery({
    search: debouncedSearch || undefined,
  });
  
  const [deleteSubcontractor, { isLoading: isDeleting }] = useDeleteSubcontractorMutation();
  const [createSubcontractor, { isLoading: isCreating, error: createError }] = useCreateSubcontractorMutation();
  const [updateSubcontractor, { isLoading: isUpdating, error: updateError }] = useUpdateSubcontractorMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const handleEdit = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setFormData({
      name: subcontractor.name,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSubcontractor(null);
    setFormData({
      name: "",
    });
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingSubcontractor(null);
    setFormData({ name: "" });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Subcontractor name is required';
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
        await updateSubcontractor({
          id: editingSubcontractor.id,
          ...formData,
        }).unwrap();
        showToast('Subcontractor updated successfully', 'success');
      } else {
        await createSubcontractor(formData).unwrap();
        showToast('Subcontractor created successfully', 'success');
      }
      handleCancel();
      refetch();
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to save subcontractor', 'error');
    }
  };

  const handleDelete = async (subcontractorId: string) => {
    const subcontractor = subcontractors.find(s => s.id === subcontractorId);
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

  const subcontractors = subcontractorsData?.subcontractors || [];

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
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.created')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleDateString();
      },
    },
  ];

  return (
    <>
      {/* Create Subcontractor Dialog */}
      <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.addSubcontractor')}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the company/subcontractor name below.
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
            <AlertDialogTitle>{t('admin.editSubcontractor')}</AlertDialogTitle>
            <AlertDialogDescription>
              Update the company/subcontractor name below.
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

      {/* Main Subcontractors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              {t('admin.subcontractorManagement')}
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addSubcontractor')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            data={subcontractors}
            columns={columns}
            isLoading={isLoading}
            isFetching={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getRowId={(subcontractor) => subcontractor.id}
            exportFilename="subcontractors"
            exportHeaders={[t('contractors.companySubcontractor'), t('admin.created')]}
            getExportData={(subcontractor) => [
              subcontractor.name,
              new Date(subcontractor.createdAt).toLocaleDateString()
            ]}
            searchValue={search}
            onSearchChange={setSearch}
          />
        </CardContent>
      </Card>
    </>
  );
}