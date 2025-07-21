"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubmissionsQuery, useDeleteSubmissionMutation, type PaginationInfo } from "@/lib/features/submissions/submissionsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import JobHazardAnalysisEdit from "@/components/admin/JobHazardAnalysisEdit";
import StartOfDayEdit from "@/components/admin/StartOfDayEdit";
import EndOfDayEdit from "@/components/admin/EndOfDayEdit";
import IncidentReportEdit from "@/components/admin/IncidentReportEdit";
import QuickIncidentReportEdit from "@/components/admin/QuickIncidentReportEdit";
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
  const { t } = useTranslation('common')
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    company: ''
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

  const { data: submissionsData, refetch, isLoading, isFetching } = useGetSubmissionsQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    type: filters.type || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: debouncedSearch || undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true
  });

  const [deleteSubmission] = useDeleteSubmissionMutation();

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
      company: ''
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
    setServerPagination({ page: 1, pageSize: 50 });
  }, []);

  const hasActiveFilters = filters.type || filters.dateFrom || filters.dateTo || filters.company || searchValue;

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

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetSubmissionsQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    type: filters.type || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: debouncedSearch || undefined,
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
    setEditingSubmission(submission);
  }, []);

  const columns = useMemo<ColumnDef<Submission>[]>(() => [
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
  ], [getSubmissionTypeLabel, getSubmissionTypeBadgeColor]);

  const filterComponents = useMemo(() => (
    <>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t('admin.type')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-48 justify-between">
              {filters.type ? getSubmissionTypeLabel(filters.type) : t('admin.allTypes')}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: ""');
              setFilters(prev => ({ ...prev, type: '' }));
            }}>
              {t('admin.allTypes')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: job-hazard-analysis');
              setFilters(prev => ({ ...prev, type: 'job-hazard-analysis' }));
            }}>
              {t('admin.jobHazardAnalysisJHA')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: start-of-day');
              setFilters(prev => ({ ...prev, type: 'start-of-day' }));
            }}>
              {t('admin.startOfDay')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: end-of-day');
              setFilters(prev => ({ ...prev, type: 'end-of-day' }));
            }}>
              {t('admin.endOfDay')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: incident-report');
              setFilters(prev => ({ ...prev, type: 'incident-report' }));
            }}>
              {t('forms.incidentReport')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: quick-incident-report');
              setFilters(prev => ({ ...prev, type: 'quick-incident-report' }));
            }}>
              {t('forms.quickIncidentReport')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">{t('admin.dateFrom')}</div>
        <Input 
          type="date" 
          className="w-full md:w-40" 
          value={filters.dateFrom}
          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t('admin.dateTo')}</div>
        <Input 
          type="date" 
          className="w-full md:w-40" 
          value={filters.dateTo}
          onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
        />
      </div>
      {hasActiveFilters && (
        <div className="space-y-1">
          <div className="text-sm font-medium">&nbsp;</div>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full md:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            {t('admin.clearFilters')}
          </Button>
        </div>
      )}
    </>
  ), [filters.type, filters.dateFrom, filters.dateTo, getSubmissionTypeLabel, hasActiveFilters, clearFilters]);

  const getExportData = useCallback((submission: Submission) => [
    submission.completedBy,
    submission.company,
    submission.date,
    submission.projectName,
    submission.submissionType
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
            {editingSubmission.submissionType === 'incident-report' && (
              <IncidentReportEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
            {editingSubmission.submissionType === 'quick-incident-report' && (
              <QuickIncidentReportEdit 
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
      />
    </div>
  );
}