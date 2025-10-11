"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { 
  useGetProjectSnapshotQuery, 
  useGetProjectSnapshotProjectsQuery, 
  useGetProjectSnapshotSubcontractorsQuery,
  useGetProjectSnapshotMetricsQuery,
  type ProjectSnapshotData as ProjectSnapshotDataType,
  type PaginationInfo
} from '@/lib/features/project-snapshot/projectSnapshotApi';
import { useProjectSnapshotExportAll } from '@/hooks/useExportAll';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Download, Building, Users, DollarSign, User, Check, X, AlertTriangle, Shield, Clock, CheckCircle } from "lucide-react";
import WeatherWidget from '@/components/WeatherWidget';
import HoursOverTimeChart from '@/components/HoursOverTimeChart';
import SubcontractorHoursAnalytics from '@/components/SubcontractorHoursAnalytics';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

// Use the type from the API
type ProjectSnapshotData = ProjectSnapshotDataType;

export default function ProjectSnapshotPage() {
  const { t } = useTranslation('common');
  const [projectFilter, setProjectFilter] = useState('');
  const [subcontractorFilter, setSubcontractorFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 50
  });
  
  
  const { admin } = useSelector((state: RootState) => state.auth);
  const exportAllProjectSnapshot = useProjectSnapshotExportAll();
  
  // Fetch metrics data for widgets using the new dedicated API
  const { data: metricsData, isLoading: isLoadingMetrics, isFetching: isFetchingMetrics, refetch: refetchMetrics } = useGetProjectSnapshotMetricsQuery({
    companyId: admin?.companyId || '',
    project: projectFilter || undefined,
    subcontractor: subcontractorFilter || undefined
  }, {
    skip: !admin?.companyId,
    refetchOnMountOrArgChange: true
  });

  // Fetch available projects and subcontractors for dropdowns
  const { data: availableProjects, isLoading: isLoadingProjects } = useGetProjectSnapshotProjectsQuery({
    companyId: admin?.companyId || '',
    subcontractor: subcontractorFilter || undefined
  }, {
    skip: !admin?.companyId
  });

  // Get the selected project's location
  const selectedProjectLocation = useMemo(() => {
    if (!projectFilter || !availableProjects) return undefined;
    const project = availableProjects.find(p => p.name === projectFilter);
    return project?.location || undefined;
  }, [projectFilter, availableProjects]);

  const { data: availableSubcontractors, isLoading: isLoadingSubcontractors } = useGetProjectSnapshotSubcontractorsQuery({
    companyId: admin?.companyId || '',
    project: projectFilter || undefined
  }, {
    skip: !admin?.companyId
  });

  // Handlers for interdependent filtering
  const handleProjectChange = useCallback((project: string) => {
    setProjectFilter(project);
    // Clear subcontractor filter when project changes to avoid invalid combinations
    if (subcontractorFilter) {
      setSubcontractorFilter('');
    }
  }, [subcontractorFilter]);

  const handleSubcontractorChange = useCallback((subcontractor: string) => {
    setSubcontractorFilter(subcontractor);
    // Clear project filter when subcontractor changes to avoid invalid combinations
    if (projectFilter) {
      setProjectFilter('');
    }
  }, [projectFilter]);

  // Force refetch metrics when filters change
  useEffect(() => {
    if (admin?.companyId) {
      console.log('Filters changed, refetching metrics:', { projectFilter, subcontractorFilter });
      refetchMetrics();
    }
  }, [projectFilter, subcontractorFilter, admin?.companyId, refetchMetrics]);

  // Function to fetch all project snapshot data for export
  const handleExportAll = useCallback(async () => {
    return await exportAllProjectSnapshot({
      companyId: admin?.companyId || '',
      project: projectFilter || undefined,
      subcontractor: subcontractorFilter || undefined,
      search: debouncedSearch || undefined,
    });
  }, [exportAllProjectSnapshot, admin?.companyId, projectFilter, subcontractorFilter, debouncedSearch]);

  // Redux API hooks
  const { data: projectSnapshotResponse, isLoading, isFetching } = useGetProjectSnapshotQuery(
    { 
      companyId: admin?.companyId || '',
      page: serverPagination.page,
      pageSize: serverPagination.pageSize,
      ...(projectFilter && { project: projectFilter }),
      ...(subcontractorFilter && { subcontractor: subcontractorFilter }),
      ...(debouncedSearch && { search: debouncedSearch })
    },
    {
      skip: !admin?.companyId
    }
  );

  const allData = projectSnapshotResponse?.projects || [];
  const serverPaginationInfo = projectSnapshotResponse?.pagination;


  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  
  // Use server-filtered data directly
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

  // Get widget stats from the new dedicated API
  const getWidgetStats = () => {
    if (!metricsData) return []
    
    return [
      {
        title: 'Total Incidents',
        value: metricsData.totalIncidents.toString(),
        change: 'All incident reports',
        icon: AlertTriangle,
        color: 'bg-red-500'
      },
      {
        title: 'TRIR',
        value: metricsData.trir.toString(),
        change: 'Total Recordable Incident Rate',
        icon: Shield,
        color: 'bg-orange-500'
      },
      {
        title: 'Man Hours',
        value: metricsData.manHours.toLocaleString(),
        change: 'Total approved hours',
        icon: Clock,
        color: 'bg-blue-500'
      },
      {
        title: 'Active Contractors',
        value: metricsData.activeContractors.toString(),
        change: 'Currently active',
        icon: Users,
        color: 'bg-green-500'
      },
      {
        title: 'Compliance Rate',
        value: `${metricsData.complianceRate}%`,
        change: 'Approved submissions',
        icon: CheckCircle,
        color: 'bg-purple-500'
      },
      {
        title: 'Completion Rate',
        value: `${metricsData.completionRate}%`,
        change: 'Approved timesheets',
        icon: Check,
        color: 'bg-indigo-500'
      },
      {
        title: 'Budget Spend',
        value: `${metricsData.spendPercentage}%`,
        change: `$${metricsData.totalSpent.toLocaleString()} of $${metricsData.totalProjectCost.toLocaleString()}`,
        icon: DollarSign,
        color: 'bg-yellow-500'
      }
    ]
  }



  // Pagination handlers
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

  // Clear pagination when filters change
  const resetPagination = useCallback(() => {
    setClientPagination({ currentPage: 1, pageSize: 10 });
    setServerPagination({ page: 1, pageSize: 50 });
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [projectFilter, subcontractorFilter, debouncedSearch, resetPagination]);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetProjectSnapshotQuery({
    companyId: admin?.companyId || '',
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    ...(projectFilter && { project: projectFilter }),
    ...(subcontractorFilter && { subcontractor: subcontractorFilter })
  }, {
    skip: !shouldPrefetch || !admin?.companyId
  });

  const columns: ColumnDef<ProjectSnapshotData>[] = useMemo(() => [
    {
      accessorKey: "projectName",
      header: t('admin.projectName'),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("projectName")}</div>
      ),
    },
    {
      accessorKey: "projectManager",
      header: t('admin.projectManager'),
      cell: ({ row }) => (
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2 text-gray-500" />
          {row.getValue("projectManager")}
        </div>
      ),
    },
    {
      accessorKey: "contractorCount",
      header: t('admin.contractorCount'),
      cell: ({ row }) => (
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-2 text-blue-500" />
          {row.getValue("contractorCount")}
        </div>
      ),
    },
    {
      accessorKey: "totalSpend",
      header: t('admin.totalSpend'),
      cell: ({ row }) => (
        <div className="flex items-center font-semibold text-green-600">
          <DollarSign className="w-4 h-4 mr-1" />
          {Number(row.getValue("totalSpend")).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "subcontractorCount",
      header: t('admin.subcontractorCount'),
      cell: ({ row }) => (
        <div className="flex items-center">
          <Building className="w-4 h-4 mr-2 text-blue-500" />
          {row.getValue("subcontractorCount")}
        </div>
      ),
    },
  ], [t]);

  const exportToCSV = () => {
    if (!allData.length) return;
    
    const csvData = allData.map(item => [
      item.projectName,
      item.projectManager,
      item.contractorCount.toString(),
      item.totalSpend.toFixed(2),
      item.subcontractorCount.toString()
    ]);

    const csvContent = [
      ['Project Name', 'Project Manager', 'Contractor Count', 'Total Spend', 'Subcontractor Count'],
      ...csvData
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_snapshot_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };


  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('admin.projectSnapshot')}
        </h1>
      </div>

      {/* Filters Section - Moved to Top */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Project Filter */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('admin.projectFilter')}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-64 justify-between text-sm"
                    disabled={isLoadingProjects}
                  >
                    <span className="truncate">
                      {isLoadingProjects ? 'Loading...' : (projectFilter || 'All projects')}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-48 overflow-y-auto">
                  <DropdownMenuItem onClick={() => handleProjectChange('')}>
                    All projects
                  </DropdownMenuItem>
                  {availableProjects?.map((project) => (
                    <DropdownMenuItem 
                      key={project.name}
                      onClick={() => handleProjectChange(project.name)}
                      className="max-w-xs"
                    >
                      <span className="truncate">{project.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Subcontractor Filter */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('admin.subcontractorFilter')}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-64 justify-between text-sm"
                    disabled={isLoadingSubcontractors}
                  >
                    <span className="truncate">
                      {isLoadingSubcontractors ? 'Loading...' : (subcontractorFilter || 'All subcontractors')}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-48 overflow-y-auto">
                  <DropdownMenuItem onClick={() => handleSubcontractorChange('')}>
                    All subcontractors
                  </DropdownMenuItem>
                  {availableSubcontractors?.map((subcontractor) => (
                    <DropdownMenuItem 
                      key={subcontractor}
                      onClick={() => handleSubcontractorChange(subcontractor)}
                      className="max-w-xs"
                    >
                      <span className="truncate">{subcontractor}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={allData.length === 0 || isLoading}
              className="md:ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('admin.exportCSV')}
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Widgets - Moved Below Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {isLoadingMetrics || isFetchingMetrics ? (
          // Loading skeletons
          Array.from({ length: 7 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          getWidgetStats().map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Weather Widget */}
      <div className="w-full">
        <WeatherWidget 
          projectLocation={selectedProjectLocation}
        />
      </div>

      {/* Hours Over Time Chart */}
      <div className="w-full">
        <HoursOverTimeChart 
          companyId={admin?.companyId || ''}
          projectFilter={projectFilter}
          subcontractorFilter={subcontractorFilter}
        />
      </div>

      {/* Subcontractor Hours Analytics */}
      <div className="w-full">
        <SubcontractorHoursAnalytics 
          companyId={admin?.companyId || ''}
          projectFilter={projectFilter}
          subcontractorFilter={subcontractorFilter}
        />
      </div>
    </div>
  );
}