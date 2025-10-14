"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useGetProjectsQuery, useDeleteProjectMutation } from "@/lib/features/projects/projectsApi";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown,
  X,
  FolderOpen,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function ProjectDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    search: '',
    manager: '',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  const { data: projectsData, isLoading, refetch } = useGetProjectsQuery({
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: filters.search || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    authType: 'admin'
  });

  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const projects = projectsData?.projects || [];
  const paginationInfo = projectsData?.pagination;

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      manager: '',
      dateFrom: '',
      dateTo: ''
    });
    setPagination({ page: 1, pageSize: 10 });
  }, []);

  const hasActiveFilters = filters.search || filters.manager || filters.dateFrom || filters.dateTo;

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleDeleteProject = (project: any) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id).unwrap();
      showToast(`Project "${projectToDelete.name}" deleted successfully`, 'success');
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to delete project', 'error');
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setProjectToDelete(null);
  };


  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Project Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
            Manage and view project overview and analytics
          </p>
        </div>

        <div className="space-y-6">
          {/* Filter Row Skeleton */}
          <div className="flex flex-wrap gap-3 items-end bg-gray-50 dark:bg-gray-800 rounded-lg py-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-60" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          {/* Projects List Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Skeleton className="w-10 h-10 rounded-full" />
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Project Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
              Manage and view project overview and analytics
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/project-onboarding')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            New Project
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filter Row */}
        <div className="flex flex-wrap gap-3 items-end bg-gray-50 dark:bg-gray-800 rounded-lg py-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">From</div>
            <DateInput 
              value={filters.dateFrom}
              onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
              placeholder="Select date"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">To</div>
            <DateInput 
              value={filters.dateTo}
              onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
              placeholder="Select date"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Search Projects</div>
            <Input
              placeholder="Search by project name or location..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-60 text-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Project Manager</div>
            <Input
              placeholder="Filter by manager name..."
              value={filters.manager}
              onChange={(e) => setFilters(prev => ({ ...prev, manager: e.target.value }))}
              className="w-40 text-xs"
            />
          </div>

          {hasActiveFilters && (
            <div className="space-y-1">
              <div className="text-xs font-medium">&nbsp;</div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No projects found
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Project Name</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">{project.name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Project Manager</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">{project.projectManager}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Location</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">{project.location}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Created</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        router.push(`/admin/project-dashboard/${project.id}`);
                      }}
                      className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      View Details
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          // TODO: Add edit functionality
                          showToast('Edit functionality coming soon', 'info');
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600" 
                          onClick={() => handleDeleteProject(project)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting ? 'Deleting...' : 'Delete Project'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {paginationInfo && paginationInfo.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!paginationInfo.hasPreviousPage}
            >
              Previous
            </Button>
            
            {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === pagination.page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={pageNum === pagination.page ? "bg-blue-600 text-white" : ""}
              >
                {pageNum}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!paginationInfo.hasNextPage}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {projectToDelete && (
            <div className="py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {projectToDelete.name}
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Location: {projectToDelete.location}</div>
                  <div>Manager: {projectToDelete.projectManager}</div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-2">This will delete:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>All project tasks and schedules</li>
                  <li>All uploaded documents and files</li>
                  <li>All contractor assignments</li>
                  <li>All subcontractor assignments</li>
                  <li>All form submissions related to this project</li>
                </ul>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}