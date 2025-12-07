"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetContractorsQuery } from '@/lib/features/contractors/contractorsApi';
import { useGetSubmissionsQuery } from '@/lib/features/submissions/submissionsApi';
import { useGetTimesheetsQuery } from '@/lib/features/timesheets/timesheetsApi';
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown,
  ArrowUpDown,
  X,
} from "lucide-react";
import {
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";

interface ContractorStatus {
  id: string;
  name: string;
  email: string;
  companyName: string;
  type: string;
  timesheetStatus: 'approved' | 'pending' | 'missing' | 'rejected';
  jhaStatus: 'submitted' | 'missing';
  eodStatus: 'submitted' | 'missing';
  sodStatus: 'submitted' | 'missing';
  eodV2Status: 'submitted' | 'missing' | 'n/a';
  sodV2Status: 'submitted' | 'missing' | 'n/a';
}

interface ProjectSubmissionTrackerProps {
  projectId: string;
  projectName: string;
}

export default function ProjectSubmissionTracker({ projectId, projectName }: ProjectSubmissionTrackerProps) {
  const { t } = useTranslation('common');
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    contractor: ''
  });
  const [searchValue, setSearchValue] = useState('');
  const [contractorStatuses, setContractorStatuses] = useState<ContractorStatus[]>([]);
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });

  // Get contractors assigned to this project
  const { data: contractorsData, isLoading: contractorsLoading } = useGetContractorsQuery({
    search: debouncedSearch,
    projectId: projectId,
    fetchAll: true,
    authType: 'admin'
  });

  // Get submissions for the selected date and project
  const { data: submissionsData, isLoading: submissionsLoading } = useGetSubmissionsQuery({
    projectId: projectId,
    dateFrom: filters.date,
    dateTo: filters.date,
    limit: 1000,
    authType: 'admin'
  });

  // Get timesheets for the selected date and project
  const { data: timesheetsData, isLoading: timesheetsLoading } = useGetTimesheetsQuery({
    projectName: projectName,
    dateFrom: filters.date,
    dateTo: filters.date,
    limit: 1000,
    authType: 'admin'
  });

  const allContractors = contractorsData?.contractors || [];

  useEffect(() => {
    if (allContractors.length > 0) {
      const statuses: ContractorStatus[] = allContractors.map(contractor => {
        const contractorName = `${contractor.firstName} ${contractor.lastName}`;
        
        const userSubmissions = submissionsData?.submissions?.filter(
          sub => sub.userId === contractor.id
        ) || [];

        const userTimesheets = timesheetsData?.timesheets?.filter(
          timesheet => timesheet.userId === contractor.id
        ) || [];

        const jhaSubmission = userSubmissions.find(sub => sub.submissionType === 'job-hazard-analysis');
        const eodSubmission = userSubmissions.find(sub => sub.submissionType === 'end-of-day');
        const sodSubmission = userSubmissions.find(sub => sub.submissionType === 'start-of-day');
        const eodV2Submission = userSubmissions.find(sub => sub.submissionType === 'end-of-day-v2');
        const sodV2Submission = userSubmissions.find(sub => sub.submissionType === 'start-of-day-v2');
        
        // Check timesheet status properly based on approval
        let timesheetStatus: 'approved' | 'pending' | 'missing' | 'rejected' = 'missing';
        if (userTimesheets.length > 0) {
          const latestTimesheet = userTimesheets[0]; // Assuming latest is first
          if (latestTimesheet.status === 'approved') {
            timesheetStatus = 'approved';
          } else if (latestTimesheet.status === 'rejected') {
            timesheetStatus = 'rejected';
          } else {
            timesheetStatus = 'pending';
          }
        }

        // V2 forms are only for foremen, others get N/A
        const isForeman = contractor.type === 'foreman';
        
        return {
          id: contractor.id,
          name: contractorName,
          email: contractor.email,
          companyName: contractor.companyName || '',
          type: contractor.type || 'contractor',
          timesheetStatus: timesheetStatus,
          jhaStatus: jhaSubmission ? 'submitted' : 'missing',
          eodStatus: eodSubmission ? 'submitted' : 'missing',
          sodStatus: sodSubmission ? 'submitted' : 'missing',
          eodV2Status: isForeman ? (eodV2Submission ? 'submitted' : 'missing') : 'n/a',
          sodV2Status: isForeman ? (sodV2Submission ? 'submitted' : 'missing') : 'n/a'
        };
      });
      setContractorStatuses(statuses);
    }
  }, [allContractors, submissionsData, timesheetsData]);

  // Apply local filtering to contractor statuses
  const filteredContractorStatuses = useMemo(() => {
    return contractorStatuses.filter(contractor => {
      // General search filter (searches name, email, company)
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const matchesSearch = 
          contractor.name.toLowerCase().includes(searchLower) ||
          contractor.email.toLowerCase().includes(searchLower) ||
          contractor.companyName?.toLowerCase().includes(searchLower);
        if (!matchesSearch) {
          return false;
        }
      }
      
      // Contractor name filter
      if (filters.contractor && !contractor.name.toLowerCase().includes(filters.contractor.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [contractorStatuses, searchValue, filters.contractor]);

  // Client-side pagination logic (using filtered data)
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = filteredContractorStatuses.slice(startIndex, endIndex);
  
  // Create client pagination info (using filtered data)
  const totalClientPages = Math.ceil(filteredContractorStatuses.length / clientPagination.pageSize);
  
  // Calculate total pages considering filtered data
  const estimatedTotalRecords = filteredContractorStatuses.length;
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
      date: format(new Date(), 'yyyy-MM-dd'),
      contractor: ''
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
  }, []);

  const hasActiveFilters = filters.date !== format(new Date(), 'yyyy-MM-dd') || filters.contractor || searchValue;

  const handlePageChange = useCallback((page: number) => {
    setClientPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  const getStatusBadge = useCallback((status: 'approved' | 'pending' | 'missing' | 'rejected' | 'submitted' | 'n/a') => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('status.approved')}</Badge>;
      case 'submitted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('status.submitted')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('status.pending')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-900 text-red-100 hover:bg-red-900">{t('status.rejected')}</Badge>;
      case 'missing':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('status.missing')}</Badge>;
      case 'n/a':
        return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">N/A</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{t('status.unknown')}</Badge>;
    }
  }, [t]);

  const columns = useMemo<ColumnDef<ContractorStatus>[]>(() => {
    const columns: ColumnDef<ContractorStatus>[] = [];

    // Add contractor name first (leftmost column)
    columns.push({
      accessorKey: 'name',
      header: ({ column }: { column: any }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.contractor')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: any }) => <div className="text-sm font-medium">{row.getValue('name')}</div>,
    });

    // Then add form type columns (in the middle)
    columns.push({
      accessorKey: 'timesheetStatus',
      header: t('nav.timesheet'),
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('timesheetStatus') as 'approved' | 'pending' | 'missing' | 'rejected';
        return <div className="text-left">{getStatusBadge(status)}</div>;
      },
    });

    columns.push({
      accessorKey: 'jhaStatus',
      header: t('forms.jobHazardAnalysis'),
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('jhaStatus') as 'submitted' | 'missing';
        return <div className="text-left">{getStatusBadge(status)}</div>;
      },
    });

    columns.push({
      accessorKey: 'sodStatus',
      header: t('admin.startOfDay'),
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('sodStatus') as 'submitted' | 'missing';
        return <div className="text-left">{getStatusBadge(status)}</div>;
      },
    });

    columns.push({
      accessorKey: 'eodStatus',
      header: t('admin.endOfDay'),
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('eodStatus') as 'submitted' | 'missing';
        return <div className="text-left">{getStatusBadge(status)}</div>;
      },
    });

    columns.push({
      accessorKey: 'sodV2Status',
      header: 'Foreman Start of Day',
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('sodV2Status') as 'submitted' | 'missing' | 'n/a';
        return <div className="text-left">{getStatusBadge(status)}</div>;
      },
    });

    columns.push({
      accessorKey: 'eodV2Status',
      header: 'Foreman End of Day',
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('eodV2Status') as 'submitted' | 'missing' | 'n/a';
        return <div className="text-left">{getStatusBadge(status)}</div>;
      },
    });


    return columns;
  }, [getStatusBadge, t]);

  const filterComponents = useMemo(() => (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('formFields.date')}</div>
        <DateInput 
          value={filters.date}
          onChange={(value) => setFilters(prev => ({ ...prev, date: value }))}
        />
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
            {allContractors?.map((contractor) => (
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
            {t('admin.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  ), [filters.date, filters.contractor, hasActiveFilters, clearFilters, allContractors, t]);

  const getExportData = useCallback((contractor: ContractorStatus) => {
    const data = [];
    
    // Add contractor name first (leftmost)
    data.push(contractor.name);
    
    // Then add form type data
    data.push(contractor.timesheetStatus);
    data.push(contractor.jhaStatus);
    data.push(contractor.sodStatus);
    data.push(contractor.eodStatus);
    data.push(contractor.sodV2Status);
    data.push(contractor.eodV2Status);
    
    return data;
  }, []);

  // Function to export all contractor status data
  const handleExportAll = useCallback(async () => {
    // Export the filtered data
    return filteredContractorStatuses;
  }, [filteredContractorStatuses]);

  const renderMobileCard = useCallback((contractor: ContractorStatus, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => {
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
                <h3 className="font-medium text-sm">{contractor.name}</h3>
                <p className="text-xs text-muted-foreground">{contractor.email}</p>
                {contractor.companyName && (
                  <p className="text-xs text-muted-foreground">{contractor.companyName}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">{t('nav.timesheet')}:</span> {getStatusBadge(contractor.timesheetStatus)}</div>
                <div><span className="font-medium">{t('forms.jobHazardAnalysis')}:</span> {getStatusBadge(contractor.jhaStatus)}</div>
                <div><span className="font-medium">{t('admin.startOfDay')}:</span> {getStatusBadge(contractor.sodStatus)}</div>
                <div><span className="font-medium">{t('admin.endOfDay')}:</span> {getStatusBadge(contractor.eodStatus)}</div>
                <div><span className="font-medium">Foreman Start of Day:</span> {getStatusBadge(contractor.sodV2Status)}</div>
                <div><span className="font-medium">Foreman End of Day:</span> {getStatusBadge(contractor.eodV2Status)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [getStatusBadge, t]);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('admin.submissionTracker')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('admin.monitorContractorStatus')} {format(new Date(filters.date), 'MMMM d, yyyy')}
        </p>
      </div>
      
      <AdminDataTable
        data={data}
        columns={columns}
        isLoading={contractorsLoading || submissionsLoading || timesheetsLoading}
        isFetching={contractorsLoading || submissionsLoading || timesheetsLoading}
        getRowId={(contractor) => contractor.id}
        exportFilename={`${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_submission_tracker`}
        exportHeaders={useMemo(() => {
          const headers = [];
          
          // Add contractor name first (leftmost)
          headers.push(t('admin.contractor'));
          
          // Then add form type headers
          headers.push(t('nav.timesheet'));
          headers.push(t('forms.jobHazardAnalysis'));
          headers.push(t('admin.startOfDay'));
          headers.push(t('admin.endOfDay'));
          headers.push('Foreman Start of Day');
          headers.push('Foreman End of Day');
          
          return headers;
        }, [t])}
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
      />
    </div>
  );
}