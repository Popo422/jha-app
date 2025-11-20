"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubmissionsQuery, useDeleteSubmissionMutation, type PaginationInfo } from "@/lib/features/submissions/submissionsApi";
import { useSubmissionExportAll } from "@/hooks/useExportAll";
import { useGetContractorsQuery } from "@/lib/features/contractors/contractorsApi";
import { useGetSubcontractorsQuery } from "@/lib/features/subcontractors/subcontractorsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { useGetWorkersCompDataQuery } from "@/lib/features/workers-comp/workersCompApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobHazardAnalysisEdit from "@/components/admin/JobHazardAnalysisEdit";
import StartOfDayEdit from "@/components/admin/StartOfDayEdit";
import EndOfDayEdit from "@/components/admin/EndOfDayEdit";
import StartOfDayV2PdfExport, { generateAndDownloadPDF } from "@/components/admin/StartOfDayV2PdfExport";
import EndOfDayV2PdfExport, { generateAndDownloadEndOfDayV2PDF } from "@/components/admin/EndOfDayV2PdfExport";
import VehicleInspectionPdfExport, { generateAndDownloadVehicleInspectionPDF } from "@/components/admin/VehicleInspectionPdfExport";
import NearMissReportPdfExport, { generateAndDownloadNearMissReportPDF } from "@/components/admin/NearMissReportPdfExport";
import ProjectWorkersComp from "@/components/admin/ProjectWorkersComp";
import ProjectSubmissionTracker from "@/components/admin/ProjectSubmissionTracker";
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
  Eye,
  Trash2,
  X,
  FileText,
  Shield,
  Heart,
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

interface ProjectSafetyModuleProps {
  projectId: string;
}

const columnHelper = createColumnHelper<Submission>();

export default function ProjectSafetyModule({ projectId }: ProjectSafetyModuleProps) {
  const router = useRouter();
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('safety-forms');
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    company: '',
    contractor: ''
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

  // Get project details to extract project name
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });
  const currentProject = projectsData?.projects?.find(p => p.id === projectId);
  const projectName = currentProject?.name;

  // Fetch dropdown data
  const { data: contractorsData } = useGetContractorsQuery({ fetchAll: true, authType: 'admin' });
  const { data: subcontractorsData } = useGetSubcontractorsQuery({ pageSize: 1000, authType: 'admin' });

  // Build combined search query for contractor filter
  const buildSearchQuery = useCallback(() => {
    const searchTerms = [];
    if (debouncedSearch) searchTerms.push(debouncedSearch);
    if (filters.contractor) searchTerms.push(filters.contractor);
    return searchTerms.join(' ');
  }, [debouncedSearch, filters.contractor]);

  const { data: submissionsData, refetch, isLoading, isFetching } = useGetSubmissionsQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    type: filters.type || undefined,
    excludeTypes: ['incident-report', 'quick-incident-report'],
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    projectName: projectName || undefined, // Filter by project name
    search: buildSearchQuery() || undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true,
    skip: !projectName // Don't fetch until we have the project name
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
      contractor: ''
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
    setServerPagination({ page: 1, pageSize: 50 });
  }, []);

  const hasActiveFilters = filters.type || filters.dateFrom || filters.dateTo || filters.company || filters.contractor || searchValue;

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
      projectName: projectName || undefined,
      search: buildSearchQuery() || undefined,
      authType: 'admin'
    });
  }, [
    exportAllSubmissions,
    filters.type,
    filters.dateFrom,
    filters.dateTo,
    filters.company,
    projectName,
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
    projectName: projectName || undefined,
    search: buildSearchQuery() || undefined,
    authType: 'admin'
  }, {
    skip: !shouldPrefetch || !projectName
  });

  const getSubmissionTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'job-hazard-analysis':
        return 'JHA';
      case 'start-of-day':
        return 'Start of Day';
      case 'start-of-day-v2':
        return 'Foreman Start of Day';
      case 'end-of-day':
        return 'End of Day';
      case 'end-of-day-v2':
        return 'Foreman End of Day';
      case 'incident-report':
        return 'Incident Report';
      case 'quick-incident-report':
        return 'Quick Incident Report';
      case 'near-miss-report':
        return 'Near Miss Report';
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
      case 'start-of-day-v2':
        return 'bg-emerald-100 text-emerald-800';
      case 'end-of-day':
        return 'bg-orange-100 text-orange-800';
      case 'end-of-day-v2':
        return 'bg-amber-100 text-amber-800';
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
  }, [deleteSubmission]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    await Promise.all(
      ids.map(id => deleteSubmission({ id, authType: 'admin' }).unwrap())
    );
  }, [deleteSubmission]);

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
    
    // For start-of-day-v2 reports, redirect to the wizard edit page
    if (submission.submissionType === 'start-of-day-v2') {
      router.push(`/admin/start-of-day-v2/${submission.id}/edit`);
      return;
    }
    
    // For end-of-day-v2 reports, redirect to the wizard edit page
    if (submission.submissionType === 'end-of-day-v2') {
      router.push(`/admin/end-of-day-v2/${submission.id}/edit`);
      return;
    }
    
    setIsViewMode(false);
    setEditingSubmission(submission);
  }, [router]);

  const handleView = useCallback((submission: Submission) => {
    // For near-miss reports, redirect to the wizard view page
    if (submission.submissionType === 'near-miss-report') {
      router.push(`/admin/near-miss-reports/${submission.id}/edit?view=true`);
      return;
    }
    
    // For vehicle inspections, redirect to the vehicle inspection view page
    if (submission.submissionType === 'vehicle-inspection') {
      router.push(`/admin/vehicle-inspections/${submission.id}/edit?view=true`);
      return;
    }
    
    // For start-of-day-v2 reports, redirect to the wizard view page
    if (submission.submissionType === 'start-of-day-v2') {
      router.push(`/admin/start-of-day-v2/${submission.id}/edit?view=true`);
      return;
    }
    
    // For end-of-day-v2 reports, redirect to the wizard view page
    if (submission.submissionType === 'end-of-day-v2') {
      router.push(`/admin/end-of-day-v2/${submission.id}/edit?view=true`);
      return;
    }
    
    // For other submission types, open in edit component with readOnly prop
    setIsViewMode(true);
    setEditingSubmission(submission);
  }, [router]);

  const columns = useMemo<ColumnDef<Submission>[]>(() => [
    {
      accessorKey: 'submissionType',
      header: 'Type',
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
          Contractor
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
          Company
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
          Date
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
      id: 'view',
      header: '',
      cell: ({ row }) => {
        const submission = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleView(submission)}
            className="h-8"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        );
      },
    },
  ], [getSubmissionTypeLabel, getSubmissionTypeBadgeColor, handleView]);

  const filterComponents = useMemo(() => (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <div className="text-xs font-medium">Type</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.type ? getSubmissionTypeLabel(filters.type) : 'All Types'}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: '' }))}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'job-hazard-analysis' }))}>
              Job Hazard Analysis (JHA)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'start-of-day' }))}>
              Start of Day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'start-of-day-v2' }))}>
              Start of Day V2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'end-of-day' }))}>
              End of Day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'end-of-day-v2' }))}>
              End of Day V2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'near-miss-report' }))}>
              Near Miss Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, type: 'vehicle-inspection' }))}>
              Vehicle Inspection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">Date From</div>
        <DateInput 
          value={filters.dateFrom}
          onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">Date To</div>
        <DateInput 
          value={filters.dateTo}
          onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">Company</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.company || 'All Companies'}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, company: '' }))}>
              All Companies
            </DropdownMenuItem>
            {subcontractorsData?.subcontractors?.map((subcontractor) => (
              <DropdownMenuItem 
                key={subcontractor.id}
                onClick={() => setFilters(prev => ({ ...prev, company: subcontractor.name }))}
                className="max-w-xs"
              >
                <span className="truncate">
                  {subcontractor.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">Contractor</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.contractor || 'All Contractors'}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, contractor: '' }))}>
              All Contractors
            </DropdownMenuItem>
            {contractorsData?.contractors?.map((contractor) => (
              <DropdownMenuItem 
                key={contractor.id}
                onClick={() => setFilters(prev => ({ ...prev, contractor: `${contractor.firstName} ${contractor.lastName}` }))}
                className="max-w-xs"
              >
                <span className="truncate">
                  {contractor.firstName} {contractor.lastName}
                </span>
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
            Clear Filters
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
    getSubmissionTypeLabel, 
    hasActiveFilters, 
    clearFilters,
    contractorsData?.contractors,
    subcontractorsData?.subcontractors
  ]);

  // Generate dynamic headers based on all form data in the dataset
  const generateDynamicHeaders = useCallback((submissions: Submission[]) => {
    const allFormFields = new Set<string>();
    const basicHeaders = ['Contractor', 'Company', 'Date', 'Type'];
    
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
  }, []);

  const getExportData = useCallback((submission: Submission, allHeaders?: string[]) => {
    const basicData = [
      submission.completedBy,
      submission.company,
      submission.date,
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
    
    const formHeaders = allHeaders.slice(4);
    const formValues = formHeaders.map(header => formDataMap.get(header) || '');
    
    return [...basicData, ...formValues];
  }, []);

  // Custom actions for the table
  const customActions = useMemo(() => [
    {
      label: 'Export PDF',
      icon: FileText,
      onClick: async (submission: Submission) => {
        if (submission.submissionType === 'start-of-day-v2') {
          const fileName = `start-of-day-v2-${submission.completedBy.replace(/\s+/g, '-')}-${submission.date}.pdf`;
          try {
            await generateAndDownloadPDF(submission.formData, fileName);
          } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
          }
        } else if (submission.submissionType === 'end-of-day-v2') {
          const fileName = `end-of-day-v2-${submission.completedBy.replace(/\s+/g, '-')}-${submission.date}.pdf`;
          try {
            await generateAndDownloadEndOfDayV2PDF(submission.formData as any, fileName);
          } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
          }
        } else if (submission.submissionType === 'vehicle-inspection') {
          const fileName = `vehicle-inspection-${submission.completedBy.replace(/\s+/g, '-')}-${submission.date}.pdf`;
          try {
            await generateAndDownloadVehicleInspectionPDF(submission.formData as any, fileName);
          } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
          }
        } else if (submission.submissionType === 'near-miss-report') {
          const fileName = `near-miss-report-${submission.completedBy.replace(/\s+/g, '-')}-${submission.date}.pdf`;
          try {
            await generateAndDownloadNearMissReportPDF(submission.formData as any, fileName);
          } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
          }
        }
      },
      show: (submission: Submission) => submission.submissionType === 'start-of-day-v2' || submission.submissionType === 'end-of-day-v2' || submission.submissionType === 'vehicle-inspection' || submission.submissionType === 'near-miss-report',
    }
  ], []);

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
              <div><span className="font-medium">Company:</span> {submission.company}</div>
              <div><span className="font-medium">Date:</span> {new Date(submission.date).toLocaleDateString()}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {customActions.map((action, index) => {
                if (action.show && !action.show(submission)) return null;
                const Icon = action.icon;
                return (
                  <DropdownMenuItem 
                    key={index}
                    onClick={() => action.onClick(submission)}
                    className="cursor-pointer"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuItem 
                onClick={() => handleView(submission)}
                className="cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleEdit(submission)}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the submission by {submission.completedBy}?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleSingleDelete(submission.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  ), [getSubmissionTypeBadgeColor, getSubmissionTypeLabel, handleView, handleEdit, handleSingleDelete, customActions]);

  // Render edit form if editing
  if (editingSubmission) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6">
            {editingSubmission.submissionType === 'job-hazard-analysis' && (
              <JobHazardAnalysisEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
                readOnly={isViewMode}
              />
            )}
            {editingSubmission.submissionType === 'start-of-day' && (
              <StartOfDayEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
                readOnly={isViewMode}
              />
            )}
            {editingSubmission.submissionType === 'end-of-day' && (
              <EndOfDayEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
                readOnly={isViewMode}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if project name is not yet available
  if (!projectName) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading project safety forms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Safety Module</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Safety forms and workers compensation for {currentProject?.name}
          </p>
        </div>
      </div>
      
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveSubTab('safety-forms')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'safety-forms'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Safety Forms
          </button>
          <button
            onClick={() => setActiveSubTab('workers-comp')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'workers-comp'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Workers Comp
          </button>
          <button
            onClick={() => setActiveSubTab('submissions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'submissions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Submissions
          </button>
        </div>
        
        {/* Render both components but hide inactive ones */}
        <div className={`${activeSubTab === 'safety-forms' ? 'block' : 'hidden'}`}>
          <AdminDataTable
            data={data}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            onEdit={handleEdit}
            onDelete={handleSingleDelete}
            onBulkDelete={handleBulkDelete}
            getRowId={(submission) => submission.id}
            exportFilename="project_safety_forms"
            exportHeaders={['Contractor', 'Company', 'Date', 'Type']}
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
            customActions={customActions}
          />
        </div>
        
        <div className={`${activeSubTab === 'workers-comp' ? 'block' : 'hidden'}`}>
          <ProjectWorkersComp projectId={projectId} />
        </div>
        
        <div className={`${activeSubTab === 'submissions' ? 'block' : 'hidden'}`}>
          <ProjectSubmissionTracker projectId={projectId} projectName={projectName} />
        </div>
      </Tabs>
    </div>
  );
}