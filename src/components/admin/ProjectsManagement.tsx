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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, ArrowUpDown, Building, ChevronDown, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export function ProjectsManagement() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [projectManagerFilter, setProjectManagerFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    projectManager: "",
    location: "",
    projectCost: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 10
  });
  
  const { showToast } = useToast();
  
  const { data: projectsData, isLoading, isFetching, refetch } = useGetProjectsQuery({
    search: debouncedSearch || undefined,
    projectManager: projectManagerFilter !== "all" ? projectManagerFilter : undefined,
    location: locationFilter !== "all" ? locationFilter : undefined,
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    authType: 'admin'
  });
  
  const { data: limitData } = useGetProjectLimitQuery();
  
  // Get all projects for filter options (separate query)
  const { data: allProjectsData } = useGetProjectsQuery({
    page: 1,
    pageSize: 100, // Reasonable number to get projects for filter options
    authType: 'admin'
  });
  
  
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [createProject, { isLoading: isCreating, error: createError }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating, error: updateError }] = useUpdateProjectMutation();

  const isFormLoading = isCreating || isUpdating;
  const formError = createError || updateError;

  const allProjects = projectsData?.projects || [];
  const serverPaginationInfo = projectsData?.pagination;
  const data = allProjects;
  
  const paginationInfo = serverPaginationInfo || {
    page: 1,
    pageSize: serverPagination.pageSize,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  };

  const handlePageChange = useCallback((page: number) => {
    setServerPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setServerPagination({ page: 1, pageSize });
  }, []);

  const handleFilterChange = useCallback(() => {
    setServerPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      projectManager: project.projectManager,
      location: project.location,
      projectCost: project.projectCost || "",
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
      projectCost: "",
    });
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingProject(null);
    setFormData({ name: "", projectManager: "", location: "", projectCost: "" });
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
      accessorKey: "projectCost",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Project Cost
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cost = row.getValue("projectCost") as string | null;
        return cost ? `$${parseFloat(cost).toLocaleString()}` : "—";
      },
    },
    {
      accessorKey: "subcontractorCount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.subcontractors')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.getValue("subcontractorCount") as number;
        return (
          <span className="text-sm">
            {count ? `${count} assigned` : '—'}
          </span>
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
              <div>
                <Label htmlFor="projectCost">Project Cost (Optional)</Label>
                <Input
                  id="projectCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.projectCost}
                  onChange={(e) => setFormData({ ...formData, projectCost: e.target.value })}
                  placeholder="Enter project cost"
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
              <div>
                <Label htmlFor="edit-projectCost">Project Cost (Optional)</Label>
                <Input
                  id="edit-projectCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.projectCost}
                  onChange={(e) => setFormData({ ...formData, projectCost: e.target.value })}
                  placeholder="Enter project cost"
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
                disabled={limitData?.currentCount != null && limitData?.limit != null && limitData.currentCount >= limitData.limit}
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
            filters={
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <div className="text-xs font-medium">Project Manager</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-36 justify-between text-xs">
                        <span className="truncate">
                          {projectManagerFilter === "all" ? "All Managers" : projectManagerFilter}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-48 overflow-y-auto">
                      <DropdownMenuItem onClick={() => {
                        setProjectManagerFilter("all");
                        handleFilterChange();
                      }}>
                        All Project Managers
                      </DropdownMenuItem>
                      {[...new Set((allProjectsData?.projects || []).map(p => p.projectManager))].map(manager => (
                        <DropdownMenuItem 
                          key={manager}
                          onClick={() => {
                            setProjectManagerFilter(manager);
                            handleFilterChange();
                          }}
                          className="max-w-xs"
                        >
                          <span className="truncate">{manager}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs font-medium">Location</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-36 justify-between text-xs">
                        <span className="truncate">
                          {locationFilter === "all" ? "All Locations" : locationFilter}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-48 overflow-y-auto">
                      <DropdownMenuItem onClick={() => {
                        setLocationFilter("all");
                        handleFilterChange();
                      }}>
                        All Locations
                      </DropdownMenuItem>
                      {[...new Set((allProjectsData?.projects || []).map(p => p.location))].map(location => (
                        <DropdownMenuItem 
                          key={location}
                          onClick={() => {
                            setLocationFilter(location);
                            handleFilterChange();
                          }}
                          className="max-w-xs"
                        >
                          <span className="truncate">{location}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {(projectManagerFilter !== "all" || locationFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setProjectManagerFilter("all");
                      setLocationFilter("all");
                      handleFilterChange();
                    }}
                    className="gap-1 text-xs"
                  >
                    <X className="h-3 w-3" />
                    Clear Filters
                  </Button>
                )}
              </div>
            }
            data={data}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getRowId={(project) => project.id}
            exportFilename="projects"
            exportHeaders={[t('tableHeaders.projectName'), t('admin.projectManager'), t('admin.location'), 'Project Cost', t('admin.subcontractors'), t('admin.created')]}
            getExportData={(project) => [
              project.name,
              project.projectManager,
              project.location,
              project.projectCost ? `$${parseFloat(project.projectCost).toLocaleString()}` : '',
              (project as any).subcontractorCount || '0',
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