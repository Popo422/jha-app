"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubmissionsQuery, useDeleteSubmissionMutation, type PaginationInfo } from "@/lib/features/submissions/submissionsApi";
import { useSubmissionExportAll } from "@/hooks/useExportAll";
import { useGetContractorsQuery } from "@/lib/features/contractors/contractorsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { useGetSubcontractorsQuery } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent } from "@/components/ui/card";
import JobHazardAnalysisEdit from "@/components/admin/JobHazardAnalysisEdit";
import StartOfDayEdit from "@/components/admin/StartOfDayEdit";
import EndOfDayEdit from "@/components/admin/EndOfDayEdit";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  ChevronDown,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Search,
} from "lucide-react";
import {
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";

interface Submission {
  id: string;
  userId: string;
  completedBy: string;
  date: string;
  dateTimeClocked?: string;
  company: string;
  projectName: string;
  submissionType: string;
  formData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const columnHelper = createColumnHelper<Submission>();

export default function SafetyFormsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    company: '',
    contractor: '',
    project: ''
  });
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 50
  });

  // Fetch dropdown data
  const { data: contractorsData } = useGetContractorsQuery({ fetchAll: true, authType: 'admin' });
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });
  const { data: subcontractorsData } = useGetSubcontractorsQuery({ pageSize: 1000, authType: 'admin' });

  // Build combined search query for contractor and project filters
  const buildSearchQuery = useCallback(() => {
    const searchTerms = [];
    if (debouncedSearch) searchTerms.push(debouncedSearch);
    if (filters.contractor) searchTerms.push(filters.contractor);
    if (filters.project) searchTerms.push(filters.project);
    return searchTerms.join(' ');
  }, [debouncedSearch, filters.contractor, filters.project]);

  const { data: submissionsData, refetch, isLoading, isFetching } = useGetSubmissionsQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    type: filters.type || undefined,
    excludeTypes: ['incident-report', 'quick-incident-report'],
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: buildSearchQuery() || undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true
  });

  const [deleteSubmission] = useDeleteSubmissionMutation();
  const exportAllSubmissions = useSubmissionExportAll();

  const allData = submissionsData?.submissions || [];
  const serverPaginationInfo = submissionsData?.pagination;

  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = allData.slice(startIndex, endIndex);
  
  // Create client pagination info
  const totalClientPages = Math.ceil(allData.length / clientPagination.pageSize);
  
  // Calculate total pages considering both client view and server data
  const estimatedTotalRecords = serverPaginationInfo?.total || allData.length;
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

  const clearFilters = useCallback(() => {
    setFilters({
      type: '',
      dateFrom: '',
      dateTo: '',
      company: '',
      contractor: '',
      project: ''
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
    setServerPagination({ page: 1, pageSize: 50 });
  }, []);

  const hasActiveFilters = filters.type || filters.dateFrom || filters.dateTo || filters.company || filters.contractor || filters.project || searchValue;

  const handlePageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allData.length / clientPagination.pageSize);
    
    if (page <= totalClientPages) {
      // Navigate within current batch
      setClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      // Need to fetch next batch
      const nextServerPage = serverPagination.page + 1;
      setServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setClientPagination({ currentPage: 1, pageSize: clientPagination.pageSize });
    }
  }, [allData.length, clientPagination.pageSize, serverPagination.page]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Function to fetch all submissions for export
  const handleExportAll = useCallback(async () => {
    return await exportAllSubmissions({
      type: filters.type || undefined,
      excludeTypes: ['incident-report', 'quick-incident-report'],
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      company: filters.company || undefined,
      search: buildSearchQuery() || undefined,
      authType: 'admin'
    });
  }, [
    exportAllSubmissions,
    filters.type,
    filters.dateFrom,
    filters.dateTo,
    filters.company,
    buildSearchQuery
  ]);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetSubmissionsQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    type: filters.type || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: buildSearchQuery() || undefined,
    authType: 'admin'
  }, {
    skip: !shouldPrefetch
  });

  const getSubmissionTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'job-hazard-analysis':
        return 'JHA';
      case 'start-of-day':
        return t('admin.startOfDay');
      case 'end-of-day':
        return t('admin.endOfDay');
      case 'incident-report':
        return t('forms.incidentReport');
      case 'quick-incident-report':
        return t('forms.quickIncidentReport');
      case 'near-miss-report':
        return t('forms.nearMissReport');
      case 'vehicle-inspection':
        return 'Vehicle Inspection';
      default:
        return type;
    }
  }, []);

  const getSubmissionTypeBadgeColor = useCallback((type: string) => {
    switch (type) {
      case 'job-hazard-analysis':
        return 'bg-blue-100 text-blue-800';
      case 'start-of-day':
        return 'bg-green-100 text-green-800';
      case 'end-of-day':
        return 'bg-orange-100 text-orange-800';
      case 'incident-report':
        return 'bg-red-100 text-red-800';
      case 'quick-incident-report':
        return 'bg-pink-100 text-pink-800';
      case 'near-miss-report':
        return 'bg-yellow-100 text-yellow-800';
      case 'vehicle-inspection':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const handleSingleDelete = useCallback(async (id: string) => {
    await deleteSubmission({ id, authType: 'admin' });
    refetch();
  }, [deleteSubmission, refetch]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      await deleteSubmission({ id, authType: 'admin' });
    }
    refetch();
  }, [deleteSubmission, refetch]);

  const handleEdit = useCallback((submission: Submission) => {
    // For near-miss reports, redirect to the wizard edit page
    if (submission.submissionType === 'near-miss-report') {
      router.push(`/admin/near-miss-reports/${submission.id}/edit`);
      return;
    }
    
    // For vehicle inspections, redirect to the vehicle inspection edit page
    if (submission.submissionType === 'vehicle-inspection') {
      router.push(`/admin/vehicle-inspections/${submission.id}/edit`);
      return;
    }
    
    setEditingSubmission(submission);
  }, [router]);

  const columns = useMemo<ColumnDef<Submission>[]>(() => [
    {
      accessorKey: 'submissionType',
      header: t('admin.type'),
      cell: ({ row }) => {
        const type = row.getValue('submissionType') as string;
        return (
          <Badge className={`${getSubmissionTypeBadgeColor(type)} text-xs px-2 py-1`}>
            {getSubmissionTypeLabel(type)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'completedBy',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.contractor')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('completedBy')}</div>,
    },
    {
      accessorKey: 'company',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.company')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('company')}</div>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('tableHeaders.date')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{new Date(row.getValue('date')).toLocaleDateString()}</div>,
      filterFn: (row, id, value) => {
        if (!value || !Array.isArray(value)) return true;
        const rowDate = new Date(row.getValue(id));
        const [from, to] = value;
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;

        if (fromDate && rowDate < fromDate) return false;
        if (toDate && rowDate > toDate) return false;
        return true;
      },
    },
    {
      accessorKey: 'projectName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.projectName')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('projectName')}</div>,
    },
  ], [getSubmissionTypeLabel, getSubmissionTypeBadgeColor]);

  const filterComponents = useMemo(() => (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.type')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              {filters.type ? getSubmissionTypeLabel(filters.type) : t('admin.allTypes')}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: '' }))}>
              {t('admin.allTypes')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'job-hazard-analysis' }))}>
              {t('admin.jobHazardAnalysisJHA')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'start-of-day' }))}>
              {t('admin.startOfDay')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'end-of-day' }))}>
              {t('admin.endOfDay')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'incident-report' }))}>
              {t('forms.incidentReport')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'quick-incident-report' }))}>
              {t('forms.quickIncidentReport')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'near-miss-report' }))}>
              {t('forms.nearMissReport')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'vehicle-inspection' }))}>
              Vehicle Inspection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.dateFrom')}</div>
        <DateInput 
          value={filters.dateFrom}
          onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.dateTo')}</div>
        <DateInput 
          value={filters.dateTo}
          onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.company')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              {filters.company || t('admin.allCompanies')}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, company: '' }))}>
              {t('admin.allCompanies')}
            </DropdownMenuItem>
            {subcontractorsData?.subcontractors?.map((subcontractor) => (
              <DropdownMenuItem 
                key={subcontractor.id}
                onClick={() => setFilters(prev => ({ ...prev, company: subcontractor.name }))}
              >
                {subcontractor.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.contractor')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              {filters.contractor || t('admin.allContractors')}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, contractor: '' }))}>
              {t('admin.allContractors')}
            </DropdownMenuItem>
            {contractorsData?.contractors?.map((contractor) => (
              <DropdownMenuItem 
                key={contractor.id}
                onClick={() => setFilters(prev => ({ ...prev, contractor: `${contractor.firstName} ${contractor.lastName}` }))}
              >
                {contractor.firstName} {contractor.lastName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.projectName')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              {filters.project || t('admin.allProjects')}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, project: '' }))}>
              {t('admin.allProjects')}
            </DropdownMenuItem>
            {projectsData?.projects?.map((project) => (
              <DropdownMenuItem 
                key={project.id}
                onClick={() => setFilters(prev => ({ ...prev, project: project.name }))}
              >
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
            {t('admin.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  ), [
    filters.type, 
    filters.dateFrom, 
    filters.dateTo, 
    filters.company, 
    filters.contractor, 
    filters.project,
    getSubmissionTypeLabel, 
    hasActiveFilters, 
    clearFilters,
    contractorsData?.contractors,
    projectsData?.projects,
    subcontractorsData?.subcontractors,
    t
  ]);

  // Generate dynamic headers based on all form data in the dataset
  const generateDynamicHeaders = useCallback((submissions: Submission[]) => {
    const allFormFields = new Set<string>();
    const basicHeaders = [t('admin.contractor'), t('admin.company'), t('tableHeaders.date'), t('admin.projectName'), t('admin.type')];
    
    submissions.forEach(submission => {
      const formData = submission.formData || {};
      const flattenFormData = (obj: any, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (value !== null && value !== undefined) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              // Check if it's a file object
              if (value.name || value.fileName || value.originalName) {
                allFormFields.add(fullKey);
              } else {
                flattenFormData(value, fullKey);
              }
            } else {
              allFormFields.add(fullKey);
            }
          }
        });
      };
      
      flattenFormData(formData);
    });
    
    return [...basicHeaders, ...Array.from(allFormFields).sort()];
  }, [t]);

  const getExportData = useCallback((submission: Submission, allHeaders?: string[]) => {
    const basicData = [
      submission.completedBy,
      submission.company,
      submission.date,
      submission.projectName,
      submission.submissionType
    ];

    // Create a map of all form data
    const formData = submission.formData || {};
    const formDataMap = new Map<string, string>();
    
    const flattenFormData = (obj: any, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Check if it's a file object
            if (value.name || value.fileName || value.originalName) {
              formDataMap.set(fullKey, value.name || value.fileName || value.originalName || 'File uploaded');
            } else {
              flattenFormData(value, fullKey);
            }
          } else if (Array.isArray(value)) {
            // Handle arrays, including arrays of file objects
            const arrayValues = value.map(item => {
              if (typeof item === 'object' && (item.name || item.fileName || item.originalName)) {
                return item.name || item.fileName || item.originalName || 'File uploaded';
              }
              return String(item);
            });
            formDataMap.set(fullKey, arrayValues.join('; '));
          } else {
            formDataMap.set(fullKey, String(value));
          }
        }
      });
    };
    
    flattenFormData(formData);
    
    // Match the headers (skip basic headers, get form field headers)
    if (!allHeaders) {
      // Fallback: return just basic data if no headers provided
      return basicData;
    }
    
    const formHeaders = allHeaders.slice(5);
    const formValues = formHeaders.map(header => formDataMap.get(header) || '');
    
    return [...basicData, ...formValues];
  }, []);

  const renderMobileCard = useCallback((submission: Submission, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="flex justify-between items-start">
          {showCheckboxes && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm">{submission.completedBy}</h3>
              <Badge className={`${getSubmissionTypeBadgeColor(submission.submissionType)} text-xs`}>
                {getSubmissionTypeLabel(submission.submissionType)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">{t('admin.company')}:</span> {submission.company}</div>
              <div><span className="font-medium">{t('tableHeaders.date')}:</span> {new Date(submission.date).toLocaleDateString()}</div>
              <div><span className="font-medium">{t('admin.projectName')}:</span> {submission.projectName}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleEdit(submission)}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin.deleteSubmission')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.deleteSubmissionConfirm', { name: submission.completedBy })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleSingleDelete(submission.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  ), [getSubmissionTypeBadgeColor, getSubmissionTypeLabel, handleEdit, handleSingleDelete]);

  // Render edit form if editing
  if (editingSubmission) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6">
            {editingSubmission.submissionType === 'job-hazard-analysis' && (
              <JobHazardAnalysisEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
            {editingSubmission.submissionType === 'start-of-day' && (
              <StartOfDayEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
            {editingSubmission.submissionType === 'end-of-day' && (
              <EndOfDayEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.safetyFormsTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('admin.safetyFormsDescription')}
        </p>
      </div>
      
      <AdminDataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onDelete={handleSingleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(submission) => submission.id}
        exportFilename="safety_forms"
        exportHeaders={[t('admin.contractor'), t('admin.company'), t('tableHeaders.date'), t('admin.projectName'), t('admin.type')]}
        getExportData={getExportData}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        serverSide={true}
        pagination={paginationInfo}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onExportAll={handleExportAll}
        generateDynamicHeaders={generateDynamicHeaders}
      />
    </div>
  );
}