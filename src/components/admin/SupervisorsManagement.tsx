"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSupervisorsQuery, useDeleteSupervisorMutation, useCreateSupervisorMutation, useUpdateSupervisorMutation, type Supervisor } from "@/lib/features/supervisors/supervisorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowUpDown, UserCheck } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export function SupervisorsManagement() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 50
  });
  
  const { showToast } = useToast();
  
  const { data: supervisorsData, isLoading, isFetching, refetch } = useGetSupervisorsQuery({
    search: debouncedSearch || undefined,
    page: serverPagination.page,
    pageSize: serverPagination.pageSize
  });
  
  const [deleteSupervisor, { isLoading: isDeleting }] = useDeleteSupervisorMutation();
  const [createSupervisor, { isLoading: isCreating, error: createError }] = useCreateSupervisorMutation();
  const [updateSupervisor, { isLoading: isUpdating, error: updateError }] = useUpdateSupervisorMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const allSupervisors = supervisorsData?.supervisors || [];
  const serverPaginationInfo = supervisorsData?.pagination;

  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = allSupervisors.slice(startIndex, endIndex);
  
  // Create client pagination info
  const totalClientPages = Math.ceil(allSupervisors.length / clientPagination.pageSize);
  
  // Calculate total pages considering both client view and server data
  const estimatedTotalRecords = serverPaginationInfo?.total || allSupervisors.length;
  const estimatedTotalPages = Math.ceil(estimatedTotalRecords / clientPagination.pageSize);
  
  const paginationInfo = {
    page: clientPagination.currentPage,
    pageSize: clientPagination.pageSize,
    total: estimatedTotalRecords,
    totalPages: estimatedTotalPages,
    hasNextPage: clientPagination.currentPage < totalClientPages || (serverPaginationInfo?.hasNextPage || false),
    hasPreviousPage: clientPagination.currentPage > 1
  };

  // Check if we need to prefetch next batch
  const shouldPrefetch = clientPagination.currentPage >= totalClientPages - 2 && serverPaginationInfo?.hasNextPage;

  const handlePageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allSupervisors.length / clientPagination.pageSize);
    
    if (page <= totalClientPages) {
      // Navigate within current batch
      setClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      // Need to fetch next batch
      const nextServerPage = serverPagination.page + 1;
      setServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setClientPagination({ currentPage: 1, pageSize: clientPagination.pageSize });
    }
  }, [allSupervisors.length, clientPagination.pageSize, serverPagination.page]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetSupervisorsQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize
  }, {
    skip: !shouldPrefetch
  });

  // Function to fetch all supervisors for export
  const handleExportAll = useCallback(async () => {
    const result = await refetch();
    if (result.data) {
      return result.data.supervisors;
    }
    return [];
  }, [refetch]);

  // Reset pagination when search changes
  const resetPagination = useCallback(() => {
    setClientPagination({ currentPage: 1, pageSize: 10 });
    setServerPagination({ page: 1, pageSize: 50 });
  }, []);

  React.useEffect(() => {
    resetPagination();
  }, [debouncedSearch, resetPagination]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = t('supervisors.nameRequired');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({ name: "" });
    setFormErrors({});
  }, []);

  const handleCreate = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      await createSupervisor({
        name: formData.name.trim(),
      }).unwrap();
      
      showToast(t('supervisors.createdSuccessfully'), 'success');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating supervisor:', error);
      showToast(error.data?.message || t('supervisors.failedToCreate'), 'error');
    }
  }, [formData, validateForm, createSupervisor, showToast, resetForm]);

  const handleEdit = useCallback((supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    setFormData({
      name: supervisor.name,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingSupervisor || !validateForm()) return;
    
    try {
      await updateSupervisor({
        id: editingSupervisor.id,
        name: formData.name.trim(),
      }).unwrap();
      
      showToast(t('supervisors.updatedSuccessfully'), 'success');
      setIsEditDialogOpen(false);
      setEditingSupervisor(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating supervisor:', error);
      showToast(error.data?.message || t('supervisors.failedToUpdate'), 'error');
    }
  }, [editingSupervisor, formData, validateForm, updateSupervisor, showToast, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteSupervisor(id).unwrap();
      showToast(t('supervisors.deletedSuccessfully'), 'success');
    } catch (error: any) {
      console.error('Error deleting supervisor:', error);
      showToast(error.data?.message || t('supervisors.failedToDelete'), 'error');
    }
  }, [deleteSupervisor, showToast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [formErrors]);

  const columns: ColumnDef<Supervisor>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          {t('supervisors.supervisorName')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t('admin.created'),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ], []);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{t('supervisors.supervisorsManagement')}</CardTitle>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('supervisors.addSupervisor')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <AdminDataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getRowId={(supervisor) => supervisor.id}
          exportFilename={t('supervisors.supervisors')}
          exportHeaders={[t('supervisors.supervisorName'), t('admin.created')]}
          getExportData={(supervisor) => [
            supervisor.name,
            new Date(supervisor.createdAt).toLocaleDateString()
          ]}
          searchValue={search}
          onSearchChange={setSearch}
          serverSide={true}
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onExportAll={handleExportAll}
        />

        {/* Create Dialog */}
        <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('supervisors.addNewSupervisor')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('supervisors.enterSupervisorInfo')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">{t('supervisors.supervisorName')}</Label>
                <Input
                  id="create-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('supervisors.enterSupervisorName')}
                  disabled={isFormLoading}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
            </div>

            {formError && (
              <div className="text-sm text-red-500 mb-4">
                {'data' in formError && typeof formError.data === 'object' && formError.data && 'message' in formError.data
                  ? (formError.data as any).message
                  : t('common.errorOccurred')}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
                disabled={isFormLoading}
              >
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCreate}
                disabled={isFormLoading}
              >
                {isFormLoading ? t('common.saving') : t('supervisors.createSupervisor')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('supervisors.editSupervisor')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('supervisors.updateSupervisorInfo')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('supervisors.supervisorName')}</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('supervisors.enterSupervisorName')}
                  disabled={isFormLoading}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
            </div>

            {formError && (
              <div className="text-sm text-red-500 mb-4">
                {'data' in formError && typeof formError.data === 'object' && formError.data && 'message' in formError.data
                  ? (formError.data as any).message
                  : t('common.errorOccurred')}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingSupervisor(null);
                  resetForm();
                }}
                disabled={isFormLoading}
              >
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleUpdate}
                disabled={isFormLoading}
              >
                {isFormLoading ? t('common.updating') : t('supervisors.updateSupervisor')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}