"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetContractorsQuery, type PaginationInfo as ContractorPaginationInfo } from '@/lib/features/contractors/contractorsApi';
import { useGetSubmissionsQuery } from '@/lib/features/submissions/submissionsApi';
import { useGetTimesheetsQuery } from '@/lib/features/timesheets/timesheetsApi';
import { useGetModulesQuery } from '@/lib/features/modules/modulesApi';
import { useGetSubcontractorsQuery } from '@/lib/features/subcontractors/subcontractorsApi';
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
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
  timesheetStatus: 'completed' | 'pending' | 'missing';
  jhaStatus: 'completed' | 'pending' | 'missing';
  eodStatus: 'completed' | 'pending' | 'missing';
  sodStatus: 'completed' | 'pending' | 'missing';
}


export default function ContractTrackerPage() {
  const { t } = useTranslation('common');
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company: '',
    contractor: ''
  });
  const [searchValue, setSearchValue] = useState('');
  const [contractorStatuses, setContractorStatuses] = useState<ContractorStatus[]>([]);
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });

  const { data: modulesData } = useGetModulesQuery({});
  const { data: subcontractorsData } = useGetSubcontractorsQuery({ pageSize: 1000, authType: 'admin' });
  
  const { data: contractorsData, isLoading: contractorsLoading } = useGetContractorsQuery({
    search: debouncedSearch,
    fetchAll: true,
    authType: 'admin'
  });

  const { data: submissionsData, isLoading: submissionsLoading } = useGetSubmissionsQuery({
    dateFrom: filters.date,
    dateTo: filters.date,
    limit: 1000,
    authType: 'admin'
  });

  const { data: timesheetsData, isLoading: timesheetsLoading } = useGetTimesheetsQuery({
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
        const timesheetSubmission = userTimesheets.length > 0;

        return {
          id: contractor.id,
          name: contractorName,
          email: contractor.email,
          companyName: contractor.companyName || '',
          timesheetStatus: timesheetSubmission ? 'completed' : 'missing',
          jhaStatus: jhaSubmission ? 'completed' : 'missing',
          eodStatus: eodSubmission ? 'completed' : 'missing',
          sodStatus: sodSubmission ? 'completed' : 'missing'
        };
      });
      setContractorStatuses(statuses);
    }
  }, [allContractors, submissionsData, timesheetsData]);

  // Apply local filtering to contractor statuses
  const filteredContractorStatuses = useMemo(() => {
    return contractorStatuses.filter(contractor => {
      // Company filter
      if (filters.company && !contractor.companyName?.toLowerCase().includes(filters.company.toLowerCase())) {
        return false;
      }
      
      // Contractor name filter
      if (filters.contractor && !contractor.name.toLowerCase().includes(filters.contractor.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [contractorStatuses, filters.company, filters.contractor]);

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
      company: '',
      contractor: ''
    });
    setSearchValue('');
    setClientPagination({ currentPage: 1, pageSize: 10 });
  }, []);

  const hasActiveFilters = filters.date !== format(new Date(), 'yyyy-MM-dd') || filters.company || filters.contractor || searchValue;

  const handlePageChange = useCallback((page: number) => {
    setClientPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);


  const getStatusBadge = useCallback((status: 'completed' | 'pending' | 'missing') => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('admin.approved')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('admin.pending')}</Badge>;
      case 'missing':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('status.missing')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{t('status.unknown')}</Badge>;
    }
  }, []);

  const columns = useMemo<ColumnDef<ContractorStatus>[]>(() => {
    const enabledModules = modulesData?.enabledModules || [];
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
    if (enabledModules.includes('timesheet')) {
      columns.push({
        accessorKey: 'timesheetStatus',
        header: t('nav.timesheet'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('timesheetStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    if (enabledModules.includes('job-hazard-analysis')) {
      columns.push({
        accessorKey: 'jhaStatus',
        header: t('forms.jobHazardAnalysis'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('jhaStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    if (enabledModules.includes('start-of-day')) {
      columns.push({
        accessorKey: 'sodStatus',
        header: t('admin.startOfDay'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('sodStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    if (enabledModules.includes('end-of-day')) {
      columns.push({
        accessorKey: 'eodStatus',
        header: t('admin.endOfDay'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('eodStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    // Finally add company and email columns (rightmost)
    columns.push({
      accessorKey: 'companyName',
      header: ({ column }: { column: any }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.company')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: any }) => <div className="text-sm">{row.getValue('companyName') || '-'}</div>,
    });

    columns.push({
      accessorKey: 'email',
      header: ({ column }: { column: any }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('auth.email')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: any }) => <div className="text-sm text-muted-foreground">{row.getValue('email')}</div>,
    });

    return columns;
  }, [getStatusBadge, modulesData]);

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
            {allContractors?.map((contractor) => (
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
  ), [filters.date, filters.company, filters.contractor, hasActiveFilters, clearFilters, subcontractorsData?.subcontractors, allContractors, t]);

  const getExportData = useCallback((contractor: ContractorStatus) => {
    const enabledModules = modulesData?.enabledModules || [];
    const data = [];
    
    // Add contractor name first (leftmost)
    data.push(contractor.name);
    
    // Then add form type data (in the middle)
    if (enabledModules.includes('timesheet')) data.push(contractor.timesheetStatus);
    if (enabledModules.includes('job-hazard-analysis')) data.push(contractor.jhaStatus);
    if (enabledModules.includes('start-of-day')) data.push(contractor.sodStatus);
    if (enabledModules.includes('end-of-day')) data.push(contractor.eodStatus);
    
    // Finally add company and email (rightmost)
    data.push(contractor.companyName || '-', contractor.email);
    
    return data;
  }, [modulesData]);

  // Function to export all contractor status data
  const handleExportAll = useCallback(async () => {
    // Export the filtered data
    return filteredContractorStatuses;
  }, [filteredContractorStatuses]);

  const renderMobileCard = useCallback((contractor: ContractorStatus, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => {
    const enabledModules = modulesData?.enabledModules || [];
    
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
                {enabledModules.includes('timesheet') && (
                  <div><span className="font-medium">{t('nav.timesheet')}:</span> {getStatusBadge(contractor.timesheetStatus)}</div>
                )}
                {enabledModules.includes('job-hazard-analysis') && (
                  <div><span className="font-medium">{t('forms.jobHazardAnalysis')}:</span> {getStatusBadge(contractor.jhaStatus)}</div>
                )}
                {enabledModules.includes('end-of-day') && (
                  <div><span className="font-medium">{t('admin.endOfDay')}:</span> {getStatusBadge(contractor.eodStatus)}</div>
                )}
                {enabledModules.includes('start-of-day') && (
                  <div><span className="font-medium">{t('admin.startOfDay')}:</span> {getStatusBadge(contractor.sodStatus)}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [getStatusBadge, modulesData]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.submissionTracker')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
{t('admin.monitorContractorStatus')} {format(new Date(filters.date), 'MMMM d, yyyy')}
        </p>
      </div>
      
      <AdminDataTable
        data={data}
        columns={columns}
        isLoading={contractorsLoading || submissionsLoading || timesheetsLoading}
        isFetching={contractorsLoading || submissionsLoading || timesheetsLoading}
        getRowId={(contractor) => contractor.id}
        exportFilename="contractor_tracker"
        exportHeaders={useMemo(() => {
          const enabledModules = modulesData?.enabledModules || [];
          const headers = [];
          
          // Add contractor name first (leftmost)
          headers.push(t('admin.contractor'));
          
          // Then add form type headers (in the middle)
          if (enabledModules.includes('timesheet')) headers.push(t('nav.timesheet'));
          if (enabledModules.includes('job-hazard-analysis')) headers.push(t('forms.jobHazardAnalysis'));
          if (enabledModules.includes('start-of-day')) headers.push(t('admin.startOfDay'));
          if (enabledModules.includes('end-of-day')) headers.push(t('admin.endOfDay'));
          
          // Finally add company and email (rightmost)
          headers.push(t('admin.company'), t('auth.email'));
          
          return headers;
        }, [modulesData, t])}
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