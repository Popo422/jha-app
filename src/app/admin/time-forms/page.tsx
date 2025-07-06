"use client";

import { useMemo, useCallback, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetTimesheetsQuery, useDeleteTimesheetMutation, type Timesheet } from "@/lib/features/timesheets/timesheetsApi";
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
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    company: '',
    status: 'all'
  });
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const { data: timesheetsData, refetch, isLoading, isFetching } = useGetTimesheetsQuery({
    limit: 1000,
    offset: 0,
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
  const [approvalDialog, setApprovalDialog] = useState<{ timesheet: Timesheet; action: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const data = timesheetsData?.timesheets || [];

  const clearFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      company: '',
      status: 'all'
    });
    setSearchValue('');
  }, []);

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

  const handleApprovalAction = useCallback(async (timesheet: Timesheet, action: 'approve' | 'reject') => {
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
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
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
          Employee
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
      accessorKey: 'jobSite',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Job Site
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('jobSite')}</div>,
    },
    {
      accessorKey: 'jobDescription',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Job Description
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
          Status
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
          Time Spent (hrs)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm font-medium">{row.getValue('timeSpent')}</div>,
    },
  ], []);

  const filterComponents = useMemo(() => (
    <>
      <div className="space-y-1">
        <div className="text-sm font-medium">Date From</div>
        <Input
          type="date"
          className="w-full md:w-40"
          value={filters.dateFrom}
          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Date To</div>
        <Input
          type="date"
          className="w-full md:w-40"
          value={filters.dateTo}
          onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Company</div>
        <Input
          type="text"
          placeholder="Filter by company..."
          className="w-full md:w-48"
          value={filters.company}
          onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Status</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-48 justify-between">
              {filters.status === 'all' ? 'All Statuses' : 
               filters.status === 'approved' ? 'Approved Only' :
               filters.status === 'pending' ? 'Pending Only' :
               filters.status === 'rejected' ? 'Rejected Only' : 'All Statuses'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'all' }))}
              className="cursor-pointer"
            >
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'approved' }))}
              className="cursor-pointer"
            >
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Approved Only
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
              className="cursor-pointer"
            >
              <Clock className="w-4 h-4 mr-2 text-gray-600" />
              Pending Only
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}
              className="cursor-pointer"
            >
              <XCircle className="w-4 h-4 mr-2 text-red-600" />
              Rejected Only
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
            Clear Filters
          </Button>
        </div>
      )}
    </>
  ), [filters.dateFrom, filters.dateTo, filters.company, filters.status, hasActiveFilters, clearFilters]);

  const getExportData = useCallback((timesheet: Timesheet) => [
    timesheet.employee,
    timesheet.company,
    timesheet.date,
    timesheet.jobSite,
    timesheet.jobDescription,
    timesheet.timeSpent
  ], []);

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
              <span className="text-sm font-bold text-green-600">{timesheet.timeSpent} hrs</span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">Company:</span> {timesheet.company}</div>
              <div><span className="font-medium">Date:</span> {new Date(timesheet.date).toLocaleDateString()}</div>
              <div><span className="font-medium">Job Site:</span> {timesheet.jobSite}</div>
              <div><span className="font-medium">Description:</span> 
                <span className="block mt-1 text-gray-800 dark:text-gray-200">{timesheet.jobDescription}</span>
              </div>
              <div className="mt-2">
                <span className="font-medium">Status:</span> {getStatusBadge(timesheet.status)}
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Review Time Forms</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          Manage and review timesheet submissions from employees
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
        exportHeaders={['Employee', 'Company', 'Date', 'Job Site', 'Job Description', 'Status', 'Time Spent']}
        getExportData={getExportData}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        customActions={[
          {
            label: 'Approve',
            icon: Check,
            onClick: (timesheet) => handleApprovalAction(timesheet, 'approve'),
            className: 'text-green-600',
            show: (timesheet) => timesheet.status === 'pending'
          },
          {
            label: 'Reject',
            icon: XCircle,
            onClick: (timesheet) => handleApprovalAction(timesheet, 'reject'),
            className: 'text-red-600',
            show: (timesheet) => timesheet.status === 'pending'
          }
        ]}
      />

      {/* Approval Dialog */}
      <AlertDialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalDialog?.action === 'approve' ? 'Approve' : 'Reject'} Timesheet
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog?.action === 'approve' 
                ? `Are you sure you want to approve the timesheet for ${approvalDialog?.timesheet?.employee}?`
                : `Are you sure you want to reject the timesheet for ${approvalDialog?.timesheet?.employee}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {approvalDialog?.action === 'reject' && (
            <div className="space-y-2">
              <label htmlFor="rejectionReason" className="text-sm font-medium">
                Rejection Reason *
              </label>
              <Textarea
                id="rejectionReason"
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApprovalDialog(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeApprovalAction}
              disabled={approvalDialog?.action === 'reject' && !rejectionReason.trim()}
              className={approvalDialog?.action === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {approvalDialog?.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}