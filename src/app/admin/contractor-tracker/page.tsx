"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetContractorsQuery } from '@/lib/features/contractors/contractorsApi';
import { useGetSubmissionsQuery } from '@/lib/features/submissions/submissionsApi';
import { useGetTimesheetsQuery } from '@/lib/features/timesheets/timesheetsApi';
import { useGetModulesQuery } from '@/lib/features/modules/modulesApi';
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  timesheetStatus: 'completed' | 'pending' | 'missing';
  jhaStatus: 'completed' | 'pending' | 'missing';
  eodStatus: 'completed' | 'pending' | 'missing';
  sodStatus: 'completed' | 'pending' | 'missing';
}


export default function ContractTrackerPage() {
  const { t } = useTranslation('common');
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [searchValue, setSearchValue] = useState('');
  const [contractorStatuses, setContractorStatuses] = useState<ContractorStatus[]>([]);
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const { data: modulesData } = useGetModulesQuery();
  const { data: contractorsData, isLoading: contractorsLoading } = useGetContractorsQuery({
    search: debouncedSearch,
    limit: 1000
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

  useEffect(() => {
    if (contractorsData?.contractors) {
      const statuses: ContractorStatus[] = contractorsData.contractors.map(contractor => {
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
          timesheetStatus: timesheetSubmission ? 'completed' : 'missing',
          jhaStatus: jhaSubmission ? 'completed' : 'missing',
          eodStatus: eodSubmission ? 'completed' : 'missing',
          sodStatus: sodSubmission ? 'completed' : 'missing'
        };
      });
      setContractorStatuses(statuses);
    }
  }, [contractorsData, submissionsData, timesheetsData]);

  const clearFilters = useCallback(() => {
    setFilters({
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setSearchValue('');
  }, []);

  const hasActiveFilters = filters.date !== format(new Date(), 'yyyy-MM-dd') || searchValue;

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
    const baseColumns: ColumnDef<ContractorStatus>[] = [
      {
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
      },
      {
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
      },
    ];

    const enabledModules = modulesData?.enabledModules || [];

    // Add module-specific columns based on enabled modules
    if (enabledModules.includes('timesheet')) {
      baseColumns.push({
        accessorKey: 'timesheetStatus',
        header: t('nav.timesheet'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('timesheetStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    if (enabledModules.includes('job-hazard-analysis')) {
      baseColumns.push({
        accessorKey: 'jhaStatus',
        header: t('forms.jobHazardAnalysis'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('jhaStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    if (enabledModules.includes('end-of-day')) {
      baseColumns.push({
        accessorKey: 'eodStatus',
        header: t('admin.endOfDay'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('eodStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    if (enabledModules.includes('start-of-day')) {
      baseColumns.push({
        accessorKey: 'sodStatus',
        header: t('admin.startOfDay'),
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('sodStatus') as 'completed' | 'pending' | 'missing';
          return <div className="text-left">{getStatusBadge(status)}</div>;
        },
      });
    }

    return baseColumns;
  }, [getStatusBadge, modulesData]);

  const filterComponents = useMemo(() => (
    <>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t('formFields.date')}</div>
        <Input 
          type="date" 
          className="w-full md:w-40" 
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
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
  ), [filters.date, hasActiveFilters, clearFilters]);

  const getExportData = useCallback((contractor: ContractorStatus) => {
    const enabledModules = modulesData?.enabledModules || [];
    const data = [contractor.name, contractor.email];
    
    if (enabledModules.includes('timesheet')) data.push(contractor.timesheetStatus);
    if (enabledModules.includes('job-hazard-analysis')) data.push(contractor.jhaStatus);
    if (enabledModules.includes('end-of-day')) data.push(contractor.eodStatus);
    if (enabledModules.includes('start-of-day')) data.push(contractor.sodStatus);
    
    return data;
  }, [modulesData]);

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
        data={contractorStatuses}
        columns={columns}
        isLoading={contractorsLoading || submissionsLoading || timesheetsLoading}
        isFetching={contractorsLoading || submissionsLoading || timesheetsLoading}
        getRowId={(contractor) => contractor.id}
        exportFilename="contractor_tracker"
        exportHeaders={useMemo(() => {
          const enabledModules = modulesData?.enabledModules || [];
          const headers = [t('admin.contractor'), t('auth.email')];
          
          if (enabledModules.includes('timesheet')) headers.push(t('nav.timesheet'));
          if (enabledModules.includes('job-hazard-analysis')) headers.push(t('forms.jobHazardAnalysis'));
          if (enabledModules.includes('end-of-day')) headers.push(t('admin.endOfDay'));
          if (enabledModules.includes('start-of-day')) headers.push(t('admin.startOfDay'));
          
          return headers;
        }, [modulesData, t])}
        getExportData={getExportData}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}