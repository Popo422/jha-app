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
  type ProjectSnapshotData as ProjectSnapshotDataType,
  type PaginationInfo
} from '@/lib/features/project-snapshot/projectSnapshotApi';
import { useProjectSnapshotExportAll } from '@/hooks/useExportAll';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Download, Building, Users, DollarSign, User, Check, X } from "lucide-react";
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import ProjectSelect from '@/components/ProjectSelect';
import SubcontractorSelect from '@/components/SubcontractorSelect';
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

  // Calculate summary statistics from all filtered data
  const totalProjects = allData.length;
  const totalContractors = allData.reduce((sum, item) => sum + item.contractorCount, 0);
  const totalSpend = allData.reduce((sum, item) => sum + item.totalSpend, 0);
  const averageSpendPerProject = totalProjects > 0 ? totalSpend / totalProjects : 0;



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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              {t('admin.totalProjects')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalProjects}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              {t('admin.totalContractors')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalContractors}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              {t('admin.totalSpend')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">${totalSpend.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              {t('admin.avgSpendPerProject')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">${averageSpendPerProject.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <ProjectSelect
              label={t('admin.projectFilter')}
              value={projectFilter}
              onChange={setProjectFilter}
              placeholder="All projects"
              authType="admin"
              className="w-full md:w-64"
            />
            
            <SubcontractorSelect
              label={t('admin.subcontractorFilter')}
              value={subcontractorFilter}
              onChange={setSubcontractorFilter}
              placeholder="All subcontractors"
              authType="admin"
              className="w-full md:w-64"
            />

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

      {/* Data Table */}
      <div className="space-y-4">
        <AdminDataTable
          data={data}
          columns={columns}
          isLoading={isLoading}
          isFetching={isFetching}
          getRowId={(item) => item.projectId}
          exportFilename="project_snapshot"
          exportHeaders={['Project Name', 'Project Manager', 'Contractor Count', 'Total Spend', 'Subcontractor Count']}
          getExportData={(item) => [
            item.projectName,
            item.projectManager,
            item.contractorCount.toString(),
            item.totalSpend.toFixed(2),
            item.subcontractorCount.toString()
          ]}
          searchValue={search}
          onSearchChange={setSearch}
          serverSide={true}
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onExportAll={handleExportAll}
        />
      </div>
    </div>
  );
}