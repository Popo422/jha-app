"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { 
  useGetProjectSnapshotQuery, 
  useGetProjectSnapshotProjectsQuery, 
  useGetProjectSnapshotSubcontractorsQuery,
  useGetProjectSnapshotMetricsQuery,
  useGetProjectTimelineQuery,
  type ProjectSnapshotData as ProjectSnapshotDataType,
  type PaginationInfo
} from '@/lib/features/project-snapshot/projectSnapshotApi';
import { useGetProjectsQuery } from '@/lib/features/projects/projectsApi';
import { useProjectSnapshotExportAll } from '@/hooks/useExportAll';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Download, Building, Users, DollarSign, User, Check, X, AlertTriangle, Shield, Clock, CheckCircle } from "lucide-react";
import WeatherWidget from '@/components/WeatherWidget';
import HoursOverTimeChart from '@/components/HoursOverTimeChart';
import SubcontractorHoursAnalytics from '@/components/SubcontractorHoursAnalytics';
import OverallProgress from '@/components/admin/OverallProgress';
import ProjectTimeline from '@/components/admin/ProjectTimeline';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

type ProjectSnapshotData = ProjectSnapshotDataType;

interface ProjectSnapshotProps {
  projectId: string;
}

export default function ProjectSnapshot({ projectId }: ProjectSnapshotProps) {
  const { t } = useTranslation('common');
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
  
  // Fetch project details to get the project name
  const { data: projectsData, isLoading: isLoadingProject } = useGetProjectsQuery({
    authType: 'admin'
  }, {
    skip: !admin?.companyId
  });
  
  // Find the current project and get its name
  const currentProject = useMemo(() => {
    if (!projectsData?.projects) return null;
    return projectsData.projects.find(p => p.id === projectId);
  }, [projectsData, projectId]);
  
  const projectName = currentProject?.name || '';
  
  // Fetch metrics data for widgets using the new dedicated API with project filter
  const { data: metricsData, isLoading: isLoadingMetrics, isFetching: isFetchingMetrics, refetch: refetchMetrics } = useGetProjectSnapshotMetricsQuery({
    companyId: admin?.companyId || '',
    project: projectName
  }, {
    skip: !admin?.companyId,
    refetchOnMountOrArgChange: true
  });

  // Get the project location
  const { data: availableProjects } = useGetProjectSnapshotProjectsQuery({
    companyId: admin?.companyId || ''
  }, {
    skip: !admin?.companyId
  });

  const selectedProjectLocation = useMemo(() => {
    if (!availableProjects) return undefined;
    const project = availableProjects.find(p => p.name === projectName);
    return project?.location || undefined;
  }, [projectName, availableProjects]);


  // Fetch project timeline data
  const { data: timelineData, isLoading: isLoadingTimeline, isFetching: isFetchingTimeline } = useGetProjectTimelineQuery({
    projectId: projectId
  }, {
    skip: !projectId,
    refetchOnMountOrArgChange: true
  });

  // Force refetch metrics when project changes
  useEffect(() => {
    if (admin?.companyId) {
      refetchMetrics();
    }
  }, [admin?.companyId, refetchMetrics]);

  // Function to fetch all project snapshot data for export
  const handleExportAll = useCallback(async () => {
    return await exportAllProjectSnapshot({
      companyId: admin?.companyId || '',
      project: projectName,
      search: debouncedSearch || undefined,
    });
  }, [exportAllProjectSnapshot, admin?.companyId, projectName, debouncedSearch]);

  // Redux API hooks
  const { data: projectSnapshotResponse, isLoading, isFetching } = useGetProjectSnapshotQuery(
    { 
      companyId: admin?.companyId || '',
      page: serverPagination.page,
      pageSize: serverPagination.pageSize,
      project: projectName,
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
  }, [debouncedSearch, resetPagination]);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetProjectSnapshotQuery({
    companyId: admin?.companyId || '',
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    project: projectName
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
    link.download = `project_snapshot_${projectName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading skeleton while fetching project details
  if (isLoadingProject || !projectName) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-6 w-64" />
        </div>

        {/* Filter skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-64" />
              </div>
              <Skeleton className="h-9 w-24 md:ml-auto" />
            </div>
          </div>
        </div>

        {/* Metrics widgets skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
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
          ))}
        </div>

        {/* Chart skeletons */}
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">{projectName} - Project Snapshot</h3>
      </div>


      {/* Metrics Widgets */}
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

      {/* Project Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Progress - Left Side */}
        <div className="lg:col-span-1">
          <OverallProgress
            progress={timelineData?.overallProgress || 0}
            startDate={timelineData?.projectStartDate || null}
            endDate={timelineData?.projectEndDate || null}
            totalTasks={timelineData?.totalTasks}
            isLoading={isLoadingTimeline || isFetchingTimeline}
          />
        </div>

        {/* Project Timeline - Right Side */}
        <div className="lg:col-span-2">
          <ProjectTimeline
            weeks={timelineData?.timelineData.weeks || []}
            taskTimelines={timelineData?.timelineData.taskTimelines || []}
            isLoading={isLoadingTimeline || isFetchingTimeline}
          />
        </div>
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
          projectFilter={projectName}
        />
      </div>

      {/* Subcontractor Hours Analytics */}
      <div className="w-full">
        <SubcontractorHoursAnalytics 
          companyId={admin?.companyId || ''}
          projectFilter={projectName}
        />
      </div>
    </div>
  );
}