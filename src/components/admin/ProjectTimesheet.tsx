"use client";

import { useMemo, useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetTimesheetsQuery, useDeleteTimesheetMutation, type Timesheet } from "@/lib/features/timesheets/timesheetsApi";
import { useTimesheetExportAll } from "@/hooks/useExportAll";
import { useGetContractorsQuery } from "@/lib/features/contractors/contractorsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import TimesheetEdit from "@/components/admin/TimesheetEdit";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowUpDown, MoreVertical, Edit, Trash2, ChevronDown, X, Check, XCircle, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DateTableCell } from "@/components/ui/date-table-cell";
import { useDateDisplay } from "@/hooks/useDateDisplay";

const columnHelper = createColumnHelper<Timesheet>();

interface ProjectTimesheetProps {
  projectId: string;
}

export default function ProjectTimesheet({ projectId }: ProjectTimesheetProps) {
  const { t } = useTranslation('common');
  const { showToast } = useToast();
  const { formatDate } = useDateDisplay();
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{ timesheet: Timesheet; action: 'approve' | 'reject' | 'pending' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    company: '',
    status: '',
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

  // Get project details to get project name
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });
  const currentProject = projectsData?.projects?.find(p => p.id === projectId);
  const projectName = currentProject?.name;

  // Get contractors assigned to this project
  const { data: contractorsData } = useGetContractorsQuery({
    projectId: projectId,
    fetchAll: true,
    authType: 'admin'
  });

  const exportAllTimesheets = useTimesheetExportAll();

  // Build query parameters
  const queryParams = useMemo(() => ({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
    ...(filters.company && { company: filters.company }),
    ...(filters.status && { status: filters.status }),
    ...(projectName && { projectName: projectName }), // Filter by project name
    authType: 'admin' as const
  }), [
    serverPagination.page, 
    serverPagination.pageSize,
    debouncedSearch, 
    filters.dateFrom, 
    filters.dateTo, 
    filters.company, 
    filters.status,
    projectName
  ]);

  const { data: timesheetsData, isLoading, isFetching, refetch } = useGetTimesheetsQuery(queryParams, {
    skip: !projectName
  });

  const [deleteTimesheet] = useDeleteTimesheetMutation();

  const allData = timesheetsData?.timesheets || [];
  const serverPaginationInfo = timesheetsData?.pagination;

  // Filter by project contractors if we have them
  const projectContractorNames = useMemo(() => {
    if (!contractorsData?.contractors) return [];
    return contractorsData.contractors.map(c => 
      `${c.firstName} ${c.lastName}`.trim()
    );
  }, [contractorsData]);

  // Additional client-side filtering by project contractors
  const filteredData = useMemo(() => {
    if (projectContractorNames.length === 0) return allData;
    
    return allData.filter(timesheet => {
      // Filter by contractor name if provided
      if (filters.contractor) {
        const matchesContractor = timesheet.employee.toLowerCase().includes(filters.contractor.toLowerCase());
        if (!matchesContractor) return false;
      }
      
      // Filter by project contractors
      return projectContractorNames.includes(timesheet.employee);
    });
  }, [allData, projectContractorNames, filters.contractor]);

  // Client-side pagination
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = filteredData.slice(startIndex, endIndex);

  const totalClientPages = Math.ceil(filteredData.length / clientPagination.pageSize);
  const estimatedTotalRecords = filteredData.length;
  const estimatedTotalPages = Math.ceil(estimatedTotalRecords / clientPagination.pageSize);

  const paginationInfo = {
    page: clientPagination.currentPage,
    pageSize: clientPagination.pageSize,
    total: estimatedTotalRecords,
    totalPages: estimatedTotalPages,
    hasNextPage: clientPagination.currentPage < totalClientPages,
    hasPreviousPage: clientPagination.currentPage > 1
  };

  const clearFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      company: '',
      status: '',
      contractor: ''
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
  }, []);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.company || filters.status || filters.contractor || searchValue;

  const handlePageChange = useCallback((page: number) => {
    setClientPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  const handleEdit = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setViewMode(false);
  };

  const handleView = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setViewMode(true);
  };

  const handleBackToList = useCallback(() => {
    setSelectedTimesheet(null);
    setViewMode(false);
    refetch(); // Refresh data when returning to list
  }, [refetch]);

  const handleSingleDelete = async (id: string) => {
    try {
      await deleteTimesheet({ id, authType: 'admin' }).unwrap();
      showToast(t('admin.timesheetDeleted'), 'success');
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || t('admin.errorDeletingTimesheet'), 'error');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await Promise.allSettled(
        ids.map(id => deleteTimesheet({ id, authType: 'admin' }).unwrap())
      );
      showToast(t('admin.timesheetsDeleted'), 'success');
      refetch();
    } catch (error: any) {
      showToast(error?.data?.error || t('admin.errorDeletingTimesheets'), 'error');
    }
  };

  const handleApprovalAction = useCallback(async (timesheet: Timesheet, action: 'approve' | 'reject' | 'pending') => {
    setApprovalDialog({ timesheet, action });
    setRejectionReason('');
  }, []);

  const executeApprovalAction = useCallback(async () => {
    if (!approvalDialog) return;
    
    try {
      const response = await fetch('/api/timesheet', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: approvalDialog.timesheet.id,
          action: approvalDialog.action,
          rejectionReason: approvalDialog.action === 'reject' ? rejectionReason : undefined
        })
      });
      
      if (response.ok) {
        showToast(
          approvalDialog.action === 'approve' ? t('admin.timesheetApproved') :
          approvalDialog.action === 'reject' ? t('admin.timesheetRejected') :
          t('admin.timesheetSetToPending'), 
          'success'
        );
        refetch();
        setApprovalDialog(null);
        setRejectionReason('');
      } else {
        showToast(t('admin.errorUpdatingTimesheet'), 'error');
      }
    } catch (error) {
      console.error('Error updating timesheet:', error);
      showToast(t('admin.errorUpdatingTimesheet'), 'error');
    }
  }, [approvalDialog, rejectionReason, refetch, showToast, t]);

  const handleExportAll = useCallback(async () => {
    return await exportAllTimesheets({
      projectName: projectName,
      search: debouncedSearch || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      company: filters.company || undefined,
      status: filters.status || undefined,
    });
  }, [exportAllTimesheets, projectName, debouncedSearch, filters]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />{t('admin.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('admin.rejected')}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t('admin.pending')}</Badge>;
    }
  }, [t]);

  const columns = useMemo<ColumnDef<Timesheet>[]>(() => [
    {
      accessorKey: 'employee',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.employee')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('employee')}</div>,
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
      cell: ({ row }) => <DateTableCell value={row.getValue('date')} />,
    },
    {
      accessorKey: 'jobDescription',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.jobDescription')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm max-w-xs truncate">{row.getValue('jobDescription')}</div>,
    },
    {
      accessorKey: 'timeSpent',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.timeSpent')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const timesheet = row.original;
        const regular = parseFloat(timesheet.timeSpent) || 0;
        const overtime = parseFloat(timesheet.overtimeHours || '0') || 0;
        const doubleTime = parseFloat(timesheet.doubleHours || '0') || 0;
        const total = regular + overtime + doubleTime;
        
        return <div className="text-sm">{total.toFixed(1)} hrs</div>;
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.status')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
  ], [t, getStatusBadge]);

  const filterComponents = useMemo(() => (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('formFields.dateFrom')}</div>
        <DateInput 
          value={filters.dateFrom}
          onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
        />
      </div>
      
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('formFields.dateTo')}</div>
        <DateInput 
          value={filters.dateTo}
          onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
        />
      </div>
      
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.status')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.status || 'All Statuses'}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: '' }))}>
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'approved' }))}>
              Approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}>
              Rejected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.contractor')}</div>
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
  ), [filters, hasActiveFilters, clearFilters, contractorsData?.contractors, t]);

  const renderMobileCard = useCallback((timesheet: Timesheet, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => {
    return (
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
              <div className="mb-2">
                <h3 className="font-medium text-sm">{timesheet.employee}</h3>
                <p className="text-xs text-muted-foreground">{timesheet.company}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Date:</span> {formatDate(timesheet.date)}</div>
                <div><span className="font-medium">Hours:</span> {timesheet.timeSpent}</div>
                <div><span className="font-medium">Status:</span> {getStatusBadge(timesheet.status)}</div>
                <div><span className="font-medium">Job:</span> {timesheet.jobDescription}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [getStatusBadge]);

  if (!currentProject) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading project information...
      </div>
    );
  }

  // If a timesheet is selected, show the edit/view component
  if (selectedTimesheet) {
    return (
      <TimesheetEdit 
        timesheet={selectedTimesheet}
        onBack={handleBackToList}
        readOnly={viewMode}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Timesheet Review</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Review and approve timesheets for {currentProject.name}
        </p>
      </div>

      <AdminDataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleSingleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(timesheet) => timesheet.id}
        exportFilename={`${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_timesheets`}
        exportHeaders={['Employee', 'Company', 'Date', 'Job Description', 'Time Spent', 'Status']}
        getExportData={(timesheet) => [
          timesheet.employee,
          timesheet.company,
          formatDate(timesheet.date),
          timesheet.jobDescription,
          timesheet.timeSpent,
          timesheet.status
        ]}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        serverSide={false}
        pagination={paginationInfo}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onExportAll={handleExportAll}
        customActions={[
          {
            label: t('admin.approve'),
            icon: Check,
            onClick: (timesheet) => handleApprovalAction(timesheet, 'approve'),
            className: 'text-green-600',
            show: (timesheet) => timesheet.status === 'pending' || timesheet.status === 'rejected'
          },
          {
            label: t('admin.reject'),
            icon: XCircle,
            onClick: (timesheet) => handleApprovalAction(timesheet, 'reject'),
            className: 'text-red-600',
            show: (timesheet) => timesheet.status === 'pending' || timesheet.status === 'approved'
          },
          {
            label: t('admin.setPending'),
            icon: Clock,
            onClick: (timesheet) => handleApprovalAction(timesheet, 'pending'),
            className: 'text-orange-600',
            show: (timesheet) => timesheet.status === 'approved' || timesheet.status === 'rejected'
          }
        ]}
      />

      {/* Approval Dialog */}
      <AlertDialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalDialog?.action === 'approve' ? t('admin.approveTimesheet') : 
               approvalDialog?.action === 'reject' ? t('admin.rejectTimesheet') : 
               t('admin.setPendingTimesheet')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog?.action === 'approve' 
                ? `Are you sure you want to approve the timesheet for ${approvalDialog?.timesheet?.employee || 'this employee'}?`
                : approvalDialog?.action === 'reject'
                ? `Are you sure you want to reject the timesheet for ${approvalDialog?.timesheet?.employee || 'this employee'}?`
                : `Are you sure you want to set this timesheet to pending for ${approvalDialog?.timesheet?.employee || 'this employee'}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {approvalDialog?.action === 'reject' && (
            <div className="space-y-2">
              <label htmlFor="rejectionReason" className="text-sm font-medium">
                {t('admin.rejectionReason')}
              </label>
              <Textarea
                id="rejectionReason"
                placeholder={t('admin.rejectionReasonPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApprovalDialog(null)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeApprovalAction}
              disabled={approvalDialog?.action === 'reject' && !rejectionReason.trim()}
              className={approvalDialog?.action === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : approvalDialog?.action === 'reject'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {approvalDialog?.action === 'approve' ? t('admin.approve') : 
               approvalDialog?.action === 'reject' ? t('admin.reject') : 
               t('admin.setPending')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}