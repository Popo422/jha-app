"use client";

import { useMemo, useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetTimesheetsQuery, useDeleteTimesheetMutation, useSyncToProcoreMutation, type Timesheet, type PaginationInfo } from "@/lib/features/timesheets/timesheetsApi";
import { useGetSubmissionsQuery, type Submission } from "@/lib/features/submissions/submissionsApi";
import { useTimesheetExportAll } from "@/hooks/useExportAll";
import { useGetContractorsQuery } from "@/lib/features/contractors/contractorsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { useGetSubcontractorsQuery } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import TimesheetEdit from "@/components/admin/TimesheetEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowUpDown, MoreVertical, Edit, Trash2, ChevronDown, X, Check, XCircle, Clock, CheckCircle, AlertTriangle, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";

const columnHelper = createColumnHelper<Timesheet>();

interface TimesheetVerification {
  id: string;
  contractor: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  calculatedHours: number;
  submittedHours: number;
  status: 'pass' | 'mismatch' | 'incomplete';
  timesheetId?: string;
  userId: string;
}

export default function TimeFormsPage() {
  const { t } = useTranslation('common')
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [activeTab, setActiveTab] = useState('review');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    company: '',
    contractor: '',
    project: '',
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

  // Fetch dropdown data
  const { data: contractorsData } = useGetContractorsQuery({ fetchAll: true, authType: 'admin' });
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });
  const { data: subcontractorsData } = useGetSubcontractorsQuery({ pageSize: 1000, authType: 'admin' });

  // Fetch SOD/EOD submissions for timesheet verification
  const { data: submissionsData } = useGetSubmissionsQuery({
    page: 1,
    pageSize: 1000,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    authType: 'admin'
  });

  // console.log('Raw submissions data:', submissionsData);
  // console.log('Raw timesheets response:', timesheetsData);
  // console.log('Timesheets allData:', allData);
  // console.log('Contractors data:', contractorsData);

  // Build combined search query for contractor and project filters
  const buildSearchQuery = useCallback(() => {
    const searchTerms = [];
    if (debouncedSearch) searchTerms.push(debouncedSearch);
    if (filters.contractor) searchTerms.push(filters.contractor);
    if (filters.project) searchTerms.push(filters.project);
    return searchTerms.join(' ');
  }, [debouncedSearch, filters.contractor, filters.project]);

  const { data: timesheetsData, refetch, isLoading, isFetching } = useGetTimesheetsQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: buildSearchQuery() || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true
  });

  const [deleteTimesheet] = useDeleteTimesheetMutation();
  const [syncToProcore] = useSyncToProcoreMutation();
  const [approvalDialog, setApprovalDialog] = useState<{ timesheet: Timesheet; action: 'approve' | 'reject' | 'pending' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [syncDialog, setSyncDialog] = useState<{ timesheets: Timesheet[] } | null>(null);
  const [procoreProjectId, setProcoreProjectId] = useState('');
  const exportAllTimesheets = useTimesheetExportAll();
  const { toast, showToast, hideToast } = useToast();

  const allData = timesheetsData?.timesheets || [];
  const contractorRates = timesheetsData?.contractorRates || {};
  const serverPaginationInfo = timesheetsData?.pagination;

  // Create timesheet verification data
  const timesheetVerifications = useMemo(() => {
    const verifications: TimesheetVerification[] = [];
    const submissions = submissionsData?.submissions || [];
    
    
    // Group submissions by user and date
    const submissionsByUserDate = submissions.reduce((acc: Record<string, { sod?: Submission; eod?: Submission }>, submission) => {
      if (submission.submissionType === 'start-of-day' || submission.submissionType === 'end-of-day') {
        const key = `${submission.userId}-${submission.date}`;
        if (!acc[key]) acc[key] = {};
        
        if (submission.submissionType === 'start-of-day') {
          acc[key].sod = submission;
        } else {
          acc[key].eod = submission;
        }
      }
      return acc;
    }, {});

    // Create a comprehensive set of all user-date combinations from both timesheets and submissions
    const allUserDateCombos = new Set<string>();
    
    // Add all timesheet user-date combos
    allData.forEach(timesheet => {
      allUserDateCombos.add(`${timesheet.userId}-${timesheet.date}`);
    });
    
    // Add all SOD/EOD user-date combos
    Object.keys(submissionsByUserDate).forEach(key => {
      allUserDateCombos.add(key);
    });
    
    
    // Process all combinations
    Array.from(allUserDateCombos).forEach(key => {
      const date = key.slice(-10); // Last 10 characters are the date
      const userId = key.slice(0, -11); // Everything except the last 11 characters (-YYYY-MM-DD)
      
      // Find timesheet for this user-date combo
      const timesheet = allData.find(ts => ts.userId === userId && ts.date === date);
      
      // Find SOD/EOD submissions for this user-date combo
      const submissionPair = submissionsByUserDate[key];
      const sod = submissionPair?.sod;
      const eod = submissionPair?.eod;
      
      // Find contractor info
      const contractor = contractorsData?.contractors?.find(c => c.id === userId);
      let contractorName: string;
      
      if (contractor) {
        contractorName = `${contractor.firstName} ${contractor.lastName}`;
      } else if (timesheet) {
        contractorName = timesheet.employee;
      } else if (sod) {
        contractorName = sod.completedBy;
      } else if (eod) {
        contractorName = eod.completedBy;
      } else {
        contractorName = `Unknown (${userId})`;
      }

      // Extract clock times from submissions if they exist
      const clockInTime = sod?.dateTimeClocked ? new Date(sod.dateTimeClocked).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : null;
      
      const clockOutTime = eod?.dateTimeClocked ? new Date(eod.dateTimeClocked).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : null;

      // Calculate hours difference (only if we have both SOD and EOD)
      let calculatedHours = 0;
      if (sod?.dateTimeClocked && eod?.dateTimeClocked) {
        const startTime = new Date(sod.dateTimeClocked);
        const endTime = new Date(eod.dateTimeClocked);
        calculatedHours = Math.round(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * 100) / 100;
      }

      const submittedHours = timesheet ? parseFloat(timesheet.timeSpent) || 0 : 0;
      
      // Determine status based on available data
      let status: 'pass' | 'mismatch' | 'incomplete' = 'incomplete';
      
      if (calculatedHours > 0 && submittedHours > 0) {
        // Both have values, compare them
        status = Math.abs(calculatedHours - submittedHours) <= 0.25 ? 'pass' : 'mismatch';
      } else {
        // Missing data - incomplete
        status = 'incomplete';
      }

      verifications.push({
        id: timesheet ? `${timesheet.id}-verification` : `${key}-verification`,
        contractor: contractorName,
        date,
        clockInTime,
        clockOutTime,
        calculatedHours,
        submittedHours,
        status,
        timesheetId: timesheet?.id,
        userId
      });
    });

    return verifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [submissionsData, allData, contractorsData]);

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
      contractor: '',
      project: '',
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

  // Function to fetch all timesheets for export
  const handleExportAll = useCallback(async () => {
    return await exportAllTimesheets({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      company: filters.company || undefined,
      search: buildSearchQuery() || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      authType: 'admin'
    });
  }, [
    exportAllTimesheets,
    filters.dateFrom,
    filters.dateTo,
    filters.company,
    filters.status,
    buildSearchQuery
  ]);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetTimesheetsQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: buildSearchQuery() || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    authType: 'admin'
  }, {
    skip: !shouldPrefetch
  });

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.company || filters.contractor || filters.project || filters.status !== 'all' || searchValue;

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

  const handleSyncToProcore = useCallback((timesheets: Timesheet[]) => {
    if (timesheets.length === 0) {
      showToast('No timesheets selected for sync.', 'error');
      return;
    }
    
    // Show status breakdown
    const statusCounts = timesheets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const statusMessage = Object.entries(statusCounts)
      .map(([status, count]) => `${count} ${status}`)
      .join(', ');
    
    showToast(`Selected ${timesheets.length} timesheets: ${statusMessage}`, 'info');
    setSyncDialog({ timesheets });
    setProcoreProjectId('');
  }, [showToast]);

  const executeProcoreSync = useCallback(async () => {
    if (!syncDialog) return;
    
    try {
      const result = await syncToProcore({
        timesheetIds: syncDialog.timesheets.map(t => t.id),
        procoreProjectId: procoreProjectId || undefined,
      }).unwrap();
      
      // Show success message
      showToast(`Successfully synced ${result.results.length} timesheets to Procore!`, 'success');
      
      // Show error details if any failed
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(err => `${err.employee}: ${err.error}`).join('\n');
        showToast(`Some timesheets failed to sync:\n${errorMessages}`, 'error');
      }
      
      setSyncDialog(null);
      setProcoreProjectId('');
      refetch();
    } catch (error: any) {
      console.error('Error syncing to Procore:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Unknown error occurred';
      if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show specific error guidance
      if (errorMessage.includes('not found in Procore')) {
        showToast(`Sync failed: ${errorMessage}\n\nPlease sync contractors and projects to Procore first.`, 'error');
      } else {
        showToast(`Error syncing to Procore: ${errorMessage}`, 'error');
      }
    }
  }, [syncDialog, procoreProjectId, syncToProcore, refetch, showToast]);

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

  const getVerificationStatusBadge = useCallback((status: 'pass' | 'mismatch' | 'incomplete') => {
    switch (status) {
      case 'pass':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />{t('admin.verificationPass')}</Badge>;
      case 'mismatch':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{t('admin.verificationMismatch')}</Badge>;
      case 'incomplete':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" />{t('admin.verificationIncomplete')}</Badge>;
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

  // Timesheet verification columns
  const verificationColumns = useMemo<ColumnDef<TimesheetVerification>[]>(() => [
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
      cell: ({ row }) => getVerificationStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'contractor',
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
      cell: ({ row }) => <div className="text-sm">{row.getValue('contractor')}</div>,
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
    },
    {
      accessorKey: 'clockInTime',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('formFields.timeClockedIn')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm font-mono">{row.getValue('clockInTime') || 'N/A'}</div>,
    },
    {
      accessorKey: 'clockOutTime',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('adminEdit.timeClockedOut')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm font-mono">{row.getValue('clockOutTime') || 'N/A'}</div>,
    },
    {
      accessorKey: 'calculatedHours',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.calculatedHours')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm font-medium">{(row.getValue('calculatedHours') as number).toFixed(2)}</div>,
    },
    {
      accessorKey: 'submittedHours',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.submittedHours')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm font-medium">{(row.getValue('submittedHours') as number).toFixed(2)}</div>,
    },
  ], [getVerificationStatusBadge]);

  const filterComponents = useMemo(() => (
    <div className="flex flex-wrap gap-3 items-end">
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
              <span className="truncate">
                {filters.company || t('admin.allCompanies')}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
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
        <div className="text-xs font-medium">{t('admin.contractor')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.contractor || t('admin.allContractors')}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
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

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('admin.projectName')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.project || t('admin.allProjects')}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
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
                className="max-w-xs"
              >
                <span className="truncate">
                  {project.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('tableHeaders.status')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-32 justify-between text-xs">
              <span className="truncate">
                {filters.status === 'all' ? t('admin.allStatuses') : 
                 filters.status === 'approved' ? t('admin.approvedOnly') :
                 filters.status === 'pending' ? t('admin.pendingOnly') :
                 filters.status === 'rejected' ? t('admin.rejectedOnly') : t('admin.allStatuses')}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
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
              <Check className="w-3 h-3 mr-2 text-green-600" />
              {t('admin.approvedOnly')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
              className="cursor-pointer"
            >
              <Clock className="w-3 h-3 mr-2 text-gray-600" />
              {t('admin.pendingOnly')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}
              className="cursor-pointer"
            >
              <XCircle className="w-3 h-3 mr-2 text-red-600" />
              {t('admin.rejectedOnly')}
            </DropdownMenuItem>
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
    filters.dateFrom, 
    filters.dateTo, 
    filters.company, 
    filters.contractor, 
    filters.project,
    filters.status, 
    hasActiveFilters, 
    clearFilters,
    contractorsData?.contractors,
    projectsData?.projects,
    subcontractorsData?.subcontractors,
    t
  ]);

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-0 p-0 h-auto justify-start space-x-8">
          <TabsTrigger 
            value="review" 
            className="bg-transparent border-0 rounded-none px-0 pb-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-gray-600 hover:text-blue-600 hover:bg-transparent transition-colors font-medium"
          >
            {t('admin.reviewTimeForms')}
          </TabsTrigger>
          <TabsTrigger 
            value="verification" 
            className="bg-transparent border-0 rounded-none px-0 pb-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-gray-600 hover:text-blue-600 hover:bg-transparent transition-colors font-medium"
          >
            {t('admin.timesheetVerification')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="review" className="mt-6">
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
          },
          {
            label: 'Sync to Procore',
            icon: Upload,
            onClick: (timesheet) => handleSyncToProcore([timesheet]),
            className: 'text-blue-600',
            show: () => true
          }
        ]}
        onExportAll={handleExportAll}
      />
        </TabsContent>

        <TabsContent value="verification" className="mt-6">
          <AdminDataTable
            data={timesheetVerifications}
            columns={verificationColumns}
            isLoading={false}
            isFetching={false}
            getRowId={(verification) => verification.id}
            exportFilename="timesheet-verification"
            exportHeaders={[t('tableHeaders.status'), t('admin.contractor'), t('tableHeaders.date'), t('formFields.timeClockedIn'), t('adminEdit.timeClockedOut'), 'Calculated Hours', t('admin.submittedHours')]}            
            getExportData={(verification) => [
              verification.status,
              verification.contractor,
              verification.date,
              verification.clockInTime || 'N/A',
              verification.clockOutTime || 'N/A',
              verification.calculatedHours.toFixed(2),
              verification.submittedHours.toFixed(2)
            ]}
            filters={filterComponents}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        </TabsContent>
      </Tabs>

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

      {/* Procore Sync Dialog */}
      <AlertDialog open={!!syncDialog} onOpenChange={() => setSyncDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Timesheets to Procore</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to sync {syncDialog?.timesheets.length || 0} timesheet(s) to Procore.
              The approval status will be mapped to Procore's workflow (pending → pending, approved → approved, rejected → pending).
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="procoreProjectId" className="text-sm font-medium">
                Procore Project ID (Optional)
              </label>
              <Input
                id="procoreProjectId"
                placeholder="Leave blank to use default project"
                value={procoreProjectId}
                onChange={(e) => setProcoreProjectId(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                If left blank, the default project from your Procore integration settings will be used.
              </p>
            </div>
            
            {syncDialog && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Timesheets to sync:</p>
                <div className="max-h-32 overflow-y-auto text-xs text-gray-600">
                  {syncDialog.timesheets.map((timesheet) => (
                    <div key={timesheet.id} className="flex justify-between">
                      <span>{timesheet.employee}</span>
                      <span>{timesheet.timeSpent} hrs on {new Date(timesheet.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSyncDialog(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeProcoreSync}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Sync to Procore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
        duration={5000}
      />
    </div>
  );
}