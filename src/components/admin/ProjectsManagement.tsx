"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetProjectsQuery, useDeleteProjectMutation, useCreateProjectMutation, useUpdateProjectMutation, useGetProjectLimitQuery, type Project, type PaginationInfo } from "@/lib/features/projects/projectsApi";
import SupervisorSelect from "@/components/SupervisorSelect";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowUpDown, Building } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export function ProjectsManagement() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    projectManager: "",
    location: "",
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
  
  const { data: projectsData, isLoading, isFetching, refetch } = useGetProjectsQuery({
    search: debouncedSearch || undefined,
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    authType: 'admin'
  });
  
  const { data: limitData } = useGetProjectLimitQuery();
  
  
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [createProject, { isLoading: isCreating, error: createError }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating, error: updateError }] = useUpdateProjectMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const allProjects = projectsData?.projects || [];
  const serverPaginationInfo = projectsData?.pagination;

  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = allProjects.slice(startIndex, endIndex);
  
  // Create client pagination info
  const totalClientPages = Math.ceil(allProjects.length / clientPagination.pageSize);
  
  // Calculate total pages considering both client view and server data
  const estimatedTotalRecords = serverPaginationInfo?.total || allProjects.length;
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
    const totalClientPages = Math.ceil(allProjects.length / clientPagination.pageSize);
    
    if (page <= totalClientPages) {
      // Navigate within current batch
      setClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      // Need to fetch next batch
      const nextServerPage = serverPagination.page + 1;
      setServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setClientPagination({ currentPage: 1, pageSize: clientPagination.pageSize });
    }
  }, [allProjects.length, clientPagination.pageSize, serverPagination.page]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetProjectsQuery({
    search: debouncedSearch || undefined,
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    authType: 'admin'
  }, {
    skip: !shouldPrefetch
  });

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      projectManager: project.projectManager,
      location: project.location,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      projectManager: "",
      location: "",
    });
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingProject(null);
    setFormData({ name: "", projectManager: "", location: "" });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!formData.projectManager.trim()) {
      errors.projectManager = 'Project manager is required';
    }
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
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
      if (editingProject) {
        await updateProject({
          id: editingProject.id,
          ...formData,
        }).unwrap();
        showToast('Project updated successfully', 'success');
      } else {
        await createProject(formData).unwrap();
        showToast('Project created successfully', 'success');
      }
      handleCancel();
      refetch();
    } catch (error: any) {
      // Handle project limit exceeded errors
      if (error?.data?.error === 'Project limit exceeded') {
        showToast(
          `Project limit exceeded: ${error.data.message}`,
          'error'
        );
      } else {
        showToast(error.data?.error || 'Failed to save project', 'error');
      }
    }
  };

  const handleDelete = async (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;

    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) {
      return;
    }

    try {
      await deleteProject(projectId).unwrap();
      showToast('Project deleted successfully', 'success');
      refetch();
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to delete project', 'error');
    }
  };

  // Define table columns
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('tableHeaders.projectName')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "projectManager",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.projectManager')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "location",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.location')}
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
      {/* Create Project Dialog */}
      <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.addProject')}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the project details below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('tableHeaders.projectName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <SupervisorSelect
                  label={t('admin.projectManager')}
                  value={formData.projectManager}
                  onChange={(value) => setFormData({ ...formData, projectManager: value })}
                  required={true}
                  authType="admin"
                  className={formErrors.projectManager ? "border-red-500" : ""}
                />
                {formErrors.projectManager && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.projectManager}</p>
                )}
              </div>
              <div>
                <Label htmlFor="location">{t('admin.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter project location"
                  className={formErrors.location ? "border-red-500" : ""}
                />
                {formErrors.location && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.location}</p>
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
                {isFormLoading ? 'Creating...' : 'Create Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Project Dialog */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.editProject')}</AlertDialogTitle>
            <AlertDialogDescription>
              Update the project details below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t('tableHeaders.projectName')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <SupervisorSelect
                  label={t('admin.projectManager')}
                  value={formData.projectManager}
                  onChange={(value) => setFormData({ ...formData, projectManager: value })}
                  required={true}
                  authType="admin"
                  className={formErrors.projectManager ? "border-red-500" : ""}
                />
                {formErrors.projectManager && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.projectManager}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-location">{t('admin.location')}</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter project location"
                  className={formErrors.location ? "border-red-500" : ""}
                />
                {formErrors.location && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.location}</p>
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
                {isFormLoading ? 'Updating...' : 'Update Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              {t('admin.projectManagement')}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              {limitData && (
                <div className="text-sm text-gray-600 dark:text-gray-400 order-3 sm:order-1">
                  {`Projects remaining: ${limitData.limit - limitData.currentCount}`}
                </div>
              )}
              <Button 
                onClick={handleAdd}
                disabled={limitData?.currentCount >= limitData?.limit}
                className="order-1 sm:order-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.addProject')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            data={data}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getRowId={(project) => project.id}
            exportFilename="projects"
            exportHeaders={[t('tableHeaders.projectName'), t('admin.projectManager'), t('admin.location'), t('admin.created')]}
            getExportData={(project) => [
              project.name,
              project.projectManager,
              project.location,
              new Date(project.createdAt).toLocaleDateString()
            ]}
            searchValue={search}
            onSearchChange={setSearch}
            serverSide={true}
            pagination={paginationInfo}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>
    </>
  );
}