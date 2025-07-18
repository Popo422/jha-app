"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { 
  useGetProjectSnapshotQuery, 
  useGetProjectSnapshotProjectsQuery, 
  useGetProjectSnapshotSubcontractorsQuery,
  type ProjectSnapshotData as ProjectSnapshotDataType
} from '@/lib/features/project-snapshot/projectSnapshotApi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Download, Building, Users, DollarSign, User, Check, X } from "lucide-react";
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

// Use the type from the API
type ProjectSnapshotData = ProjectSnapshotDataType;

export default function ProjectSnapshotPage() {
  const { t } = useTranslation('common');
  const [projectFilter, setProjectFilter] = useState('');
  const [subcontractorFilter, setSubcontractorFilter] = useState('');
  const [search, setSearch] = useState('');
  
  // Searchable select states
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [subcontractorSearchOpen, setSubcontractorSearchOpen] = useState(false);
  const [subcontractorSearchTerm, setSubcontractorSearchTerm] = useState('');
  
  // Refs for dropdown management
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const subcontractorDropdownRef = useRef<HTMLDivElement>(null);
  
  const { admin } = useSelector((state: RootState) => state.auth);

  // Redux API hooks
  const { data: projectSnapshotData = [], isLoading } = useGetProjectSnapshotQuery(
    { 
      companyId: admin?.companyId || '',
      ...(projectFilter && { project: projectFilter }),
      ...(subcontractorFilter && { subcontractor: subcontractorFilter })
    },
    {
      skip: !admin?.companyId
    }
  );

  const { data: uniqueProjects = [], isLoading: projectsLoading } = useGetProjectSnapshotProjectsQuery(
    { 
      companyId: admin?.companyId || '',
      ...(subcontractorFilter && { subcontractor: subcontractorFilter })
    },
    {
      skip: !admin?.companyId
    }
  );

  const { data: uniqueSubcontractors = [], isLoading: subcontractorsLoading } = useGetProjectSnapshotSubcontractorsQuery(
    { 
      companyId: admin?.companyId || '',
      ...(projectFilter && { project: projectFilter })
    },
    {
      skip: !admin?.companyId
    }
  );

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search) return projectSnapshotData;
    
    const searchLower = search.toLowerCase();
    return projectSnapshotData.filter(item =>
      item.projectName.toLowerCase().includes(searchLower) ||
      item.projectManager.toLowerCase().includes(searchLower) ||
      item.subcontractorCount.toString().includes(searchLower)
    );
  }, [projectSnapshotData, search]);

  // Calculate summary statistics
  const totalProjects = filteredData.length;
  const totalContractors = filteredData.reduce((sum, item) => sum + item.contractorCount, 0);
  const totalSpend = filteredData.reduce((sum, item) => sum + item.totalSpend, 0);
  const averageSpendPerProject = totalProjects > 0 ? totalSpend / totalProjects : 0;


  // Filtered lists for searchable selects
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm) return uniqueProjects;
    return uniqueProjects.filter(project => 
      project.toLowerCase().includes(projectSearchTerm.toLowerCase())
    );
  }, [uniqueProjects, projectSearchTerm]);

  const filteredSubcontractors = useMemo(() => {
    if (!subcontractorSearchTerm) return uniqueSubcontractors;
    return uniqueSubcontractors.filter(subcontractor => 
      subcontractor.toLowerCase().includes(subcontractorSearchTerm.toLowerCase())
    );
  }, [uniqueSubcontractors, subcontractorSearchTerm]);

  // Clear invalid filters when the lists change
  useEffect(() => {
    if (projectFilter && uniqueProjects.length > 0 && !uniqueProjects.includes(projectFilter)) {
      setProjectFilter('');
    }
  }, [uniqueProjects, projectFilter]);

  useEffect(() => {
    if (subcontractorFilter && uniqueSubcontractors.length > 0 && !uniqueSubcontractors.includes(subcontractorFilter)) {
      setSubcontractorFilter('');
    }
  }, [uniqueSubcontractors, subcontractorFilter]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectSearchOpen(false);
      }
      if (subcontractorDropdownRef.current && !subcontractorDropdownRef.current.contains(event.target as Node)) {
        setSubcontractorSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!filteredData.length) return;
    
    const csvData = filteredData.map(item => [
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

  // Searchable Project Select Component
  const ProjectSearchSelect = () => (
    <div className="space-y-1">
      <div className="text-sm font-medium">{t('admin.projectFilter')}</div>
      <div className="relative" ref={projectDropdownRef}>
        <div className="relative">
          <Input
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setProjectSearchTerm(e.target.value);
              if (!projectSearchOpen) setProjectSearchOpen(true);
            }}
            onFocus={() => {
              setProjectSearchOpen(true);
              setProjectSearchTerm(projectFilter);
            }}
            placeholder={projectsLoading ? "Loading projects..." : "Search projects..."}
            className="w-full md:w-64 pr-20"
            disabled={projectsLoading}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {projectFilter && !projectsLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProjectFilter('');
                  setProjectSearchTerm('');
                  setProjectSearchOpen(false);
                }}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {projectsLoading && (
              <div className="h-6 w-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 dark:border-gray-100"></div>
              </div>
            )}
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setProjectSearchOpen(!projectSearchOpen)}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={projectsLoading}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", projectSearchOpen && "rotate-180")} />
            </Button>
          </div>
        </div>

        {projectSearchOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
            <div
              className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              onClick={() => {
                setProjectFilter('');
                setProjectSearchTerm('');
                setProjectSearchOpen(false);
              }}
            >
              {t('admin.allProjects')}
            </div>
            {projectsLoading ? (
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                Loading projects...
              </div>
            ) : filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <div
                  key={project}
                  className={cn(
                    "p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                    project === projectFilter && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  )}
                  onClick={() => {
                    setProjectFilter(project);
                    setProjectSearchTerm('');
                    setProjectSearchOpen(false);
                  }}
                >
                  <span className="text-sm">{project}</span>
                  {project === projectFilter && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                No projects found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Searchable Subcontractor Select Component
  const SubcontractorSearchSelect = () => (
    <div className="space-y-1">
      <div className="text-sm font-medium">{t('admin.subcontractorFilter')}</div>
      <div className="relative" ref={subcontractorDropdownRef}>
        <div className="relative">
          <Input
            value={subcontractorFilter}
            onChange={(e) => {
              setSubcontractorFilter(e.target.value);
              setSubcontractorSearchTerm(e.target.value);
              if (!subcontractorSearchOpen) setSubcontractorSearchOpen(true);
            }}
            onFocus={() => {
              setSubcontractorSearchOpen(true);
              setSubcontractorSearchTerm(subcontractorFilter);
            }}
            placeholder={subcontractorsLoading ? "Loading subcontractors..." : "Search subcontractors..."}
            className="w-full md:w-64 pr-20"
            disabled={subcontractorsLoading}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {subcontractorFilter && !subcontractorsLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubcontractorFilter('');
                  setSubcontractorSearchTerm('');
                  setSubcontractorSearchOpen(false);
                }}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {subcontractorsLoading && (
              <div className="h-6 w-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 dark:border-gray-100"></div>
              </div>
            )}
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSubcontractorSearchOpen(!subcontractorSearchOpen)}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={subcontractorsLoading}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", subcontractorSearchOpen && "rotate-180")} />
            </Button>
          </div>
        </div>

        {subcontractorSearchOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
            <div
              className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              onClick={() => {
                setSubcontractorFilter('');
                setSubcontractorSearchTerm('');
                setSubcontractorSearchOpen(false);
              }}
            >
              {t('admin.allSubcontractors')}
            </div>
            {subcontractorsLoading ? (
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                Loading subcontractors...
              </div>
            ) : filteredSubcontractors.length > 0 ? (
              filteredSubcontractors.map((subcontractor) => (
                <div
                  key={subcontractor}
                  className={cn(
                    "p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                    subcontractor === subcontractorFilter && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  )}
                  onClick={() => {
                    setSubcontractorFilter(subcontractor);
                    setSubcontractorSearchTerm('');
                    setSubcontractorSearchOpen(false);
                  }}
                >
                  <span className="text-sm">{subcontractor}</span>
                  {subcontractor === subcontractorFilter && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                No subcontractors found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

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
            <ProjectSearchSelect />
            <SubcontractorSearchSelect />

            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredData.length === 0 || isLoading}
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
          data={filteredData}
          columns={columns}
          isLoading={isLoading}
          isFetching={isLoading}
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
        />
      </div>
    </div>
  );
}