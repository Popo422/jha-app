"use client";

import { useMemo, useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetTimesheetsQuery, useDeleteTimesheetMutation, type Timesheet, type PaginationInfo } from "@/lib/features/timesheets/timesheetsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import TimesheetEdit from "@/components/admin/TimesheetEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowUpDown, MoreVertical, Edit, Trash2, ChevronDown, X, Check, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";

const columnHelper = createColumnHelper<Timesheet>();

export default function TimeFormsPage() {
  const { t } = useTranslation('common')
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    company: '',
    status: 'all'
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

  const { data: timesheetsData, refetch, isLoading, isFetching } = useGetTimesheetsQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: debouncedSearch || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true
  });

  const [deleteTimesheet] = useDeleteTimesheetMutation();
  const [approvalDialog, setApprovalDialog] = useState<{ timesheet: Timesheet; action: 'approve' | 'reject' | 'pending' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const allData = timesheetsData?.timesheets || [];
  const contractorRates = timesheetsData?.contractorRates || {};
  const serverPaginationInfo = timesheetsData?.pagination;

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
      dateFrom: '',
      dateTo: '',
      company: '',
      status: 'all'
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
    setServerPagination({ page: 1, pageSize: 50 });
  }, []);

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
  const { data: prefetchData } = useGetTimesheetsQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: debouncedSearch || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    authType: 'admin'
  }, {
    skip: !shouldPrefetch
  });

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.company || filters.status !== 'all' || searchValue;

  const handleEdit = useCallback((timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedTimesheet(null);
    refetch(); // Refresh data when returning to list
  }, [refetch]);

  const handleSingleDelete = useCallback(async (id: string) => {
    await deleteTimesheet({ id, authType: 'admin' });
    refetch();
  }, [deleteTimesheet, refetch]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      await deleteTimesheet({ id, authType: 'admin' });
    }
    refetch();
  }, [deleteTimesheet, refetch]);

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
        refetch();
        setApprovalDialog(null);
        setRejectionReason('');
      } else {
        console.error('Failed to update timesheet approval status');
      }
    } catch (error) {
      console.error('Error updating timesheet:', error);
    }
  }, [approvalDialog, rejectionReason, refetch]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />{t('admin.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('admin.rejected')}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t('admin.pending')}</Badge>;
    }
  }, []);

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
      cell: ({ row }) => <div className="text-sm max-w-xs truncate" title={row.getValue('jobDescription')}>{row.getValue('jobDescription')}</div>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('tableHeaders.status')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'timeSpent',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.hoursWorked')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm font-medium">{row.getValue('timeSpent')}</div>,
    },
    {
      accessorKey: 'cost',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.cost')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const timesheet = row.original;
        const timeSpent = parseFloat(timesheet.timeSpent || '0');
        const rate = parseFloat(contractorRates[timesheet.userId] || '0');
        const cost = timeSpent * rate;
        return <div className="text-sm font-medium text-green-600">${cost.toFixed(2)}</div>;
      },
    },
  ], [contractorRates]);

  const filterComponents = useMemo(() => (
    <>
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
      <div className="space-y-1">
        <div className="text-sm font-medium">{t('admin.company')}</div>
        <Input
          type="text"
          placeholder={t('admin.filterByCompany')}
          className="w-full md:w-48"
          value={filters.company}
          onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t('tableHeaders.status')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-48 justify-between">
              {filters.status === 'all' ? t('admin.allStatuses') : 
               filters.status === 'approved' ? t('admin.approvedOnly') :
               filters.status === 'pending' ? t('admin.pendingOnly') :
               filters.status === 'rejected' ? t('admin.rejectedOnly') : t('admin.allStatuses')}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'all' }))}
              className="cursor-pointer"
            >
              {t('admin.allStatuses')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'approved' }))}
              className="cursor-pointer"
            >
              <Check className="w-4 h-4 mr-2 text-green-600" />
              {t('admin.approvedOnly')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
              className="cursor-pointer"
            >
              <Clock className="w-4 h-4 mr-2 text-gray-600" />
              {t('admin.pendingOnly')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}
              className="cursor-pointer"
            >
              <XCircle className="w-4 h-4 mr-2 text-red-600" />
              {t('admin.rejectedOnly')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  ), [filters.dateFrom, filters.dateTo, filters.company, filters.status, hasActiveFilters, clearFilters]);

  const getExportData = useCallback((timesheet: Timesheet) => {
    const timeSpent = parseFloat(timesheet.timeSpent || '0');
    const rate = parseFloat(contractorRates[timesheet.userId] || '0');
    const cost = timeSpent * rate;
    return [
      timesheet.employee,
      timesheet.company,
      timesheet.date,
      timesheet.projectName,
      timesheet.jobDescription,
      timesheet.timeSpent,
      `$${cost.toFixed(2)}`
    ];
  }, [contractorRates]);

  const renderMobileCard = useCallback((timesheet: Timesheet, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="flex justify-between items-start">
          {showCheckboxes && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 mt-1 mr-3"
            />
          )}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm">{timesheet.employee}</h3>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">{timesheet.timeSpent} hrs</span>
                <div className="text-sm font-bold text-green-600">
                  ${((parseFloat(timesheet.timeSpent || '0')) * (parseFloat(contractorRates[timesheet.userId] || '0'))).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">{t('admin.company')}:</span> {timesheet.company}</div>
              <div><span className="font-medium">{t('tableHeaders.date')}:</span> {new Date(timesheet.date).toLocaleDateString()}</div>
              <div><span className="font-medium">{t('admin.projectName')}:</span> {timesheet.projectName}</div>
              <div><span className="font-medium">{t('admin.jobDescription')}:</span> 
                <span className="block mt-1 text-gray-800 dark:text-gray-200">{timesheet.jobDescription}</span>
              </div>
              <div className="mt-2">
                <span className="font-medium">{t('tableHeaders.status')}:</span> {getStatusBadge(timesheet.status)}
              </div>
              {timesheet.status === 'rejected' && timesheet.rejectionReason && (
                <div className="mt-1">
                  <span className="font-medium text-red-600">Rejection Reason:</span>
                  <span className="block mt-1 text-red-700 dark:text-red-400 text-xs">{timesheet.rejectionReason}</span>
                </div>
              )}
              {timesheet.status !== 'pending' && timesheet.approvedByName && (
                <div className="mt-1 text-xs text-gray-500">
                  {timesheet.status === 'approved' ? 'Approved' : 'Rejected'} by {timesheet.approvedByName}
                  {timesheet.approvedAt && ` on ${new Date(timesheet.approvedAt).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {timesheet.status === 'pending' && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleApprovalAction(timesheet, 'approve')}
                    className="cursor-pointer text-green-600"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleApprovalAction(timesheet, 'reject')}
                    className="cursor-pointer text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {timesheet.status === 'approved' && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleApprovalAction(timesheet, 'reject')}
                    className="cursor-pointer text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleApprovalAction(timesheet, 'pending')}
                    className="cursor-pointer text-orange-600"
                  >
                    <Clock className="h-4 w-4 mr-2" />
{t('admin.setPending')}
                  </DropdownMenuItem>
                </>
              )}
              {timesheet.status === 'rejected' && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleApprovalAction(timesheet, 'approve')}
                    className="cursor-pointer text-green-600"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleApprovalAction(timesheet, 'pending')}
                    className="cursor-pointer text-orange-600"
                  >
                    <Clock className="h-4 w-4 mr-2" />
{t('admin.setPending')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem 
                onClick={() => handleEdit(timesheet)}
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
                    <AlertDialogTitle>Delete Timesheet</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this timesheet for {timesheet.employee}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleSingleDelete(timesheet.id)}
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
  ), [handleEdit, handleSingleDelete]);

  if (selectedTimesheet) {
    return (
      <TimesheetEdit 
        timesheet={selectedTimesheet}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.timeFormsTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          {t('admin.timeFormsDescription')}
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
        getRowId={(timesheet) => timesheet.id}
        exportFilename="timesheets"
        exportHeaders={[t('admin.employee'), t('admin.company'), t('tableHeaders.date'), t('admin.projectName'), t('admin.jobDescription'), t('admin.hoursWorked'), t('admin.cost')]}
        getExportData={getExportData}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        serverSide={true}
        pagination={paginationInfo}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
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
                : `${t('admin.setPendingTimesheetConfirm')} ${approvalDialog?.timesheet?.employee || 'this employee'}?`
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