"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetIncidentsQuery, useDeleteIncidentMutation } from "@/lib/features/incidents/incidentsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { useGetSubcontractorsQuery } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent } from "@/components/ui/card";
import IncidentReportEdit from "@/components/admin/IncidentReportEdit";
import CreateIncidentReport from "@/components/admin/incidents/CreateIncidentReport";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  ChevronDown,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import {
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";

interface Incident {
  id: string;
  reportedBy: string;
  injuredEmployee: string;
  projectName: string;
  dateReported: string;
  dateOfIncident: string;
  incidentType: 'incident-report' | 'quick-incident-report';
  company: string;
  status: 'reported' | 'investigating' | 'closed';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  injuryType?: string;
  createdAt: string;
  updatedAt: string;
}

const columnHelper = createColumnHelper<Incident>();

export default function IncidentReportsTab() {
  const { t } = useTranslation('common');
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    company: '',
    reportedBy: '',
    injuredEmployee: '',
    project: ''
  });
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10
  });

  // Fetch dropdown data
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });
  const { data: subcontractorsData } = useGetSubcontractorsQuery({ pageSize: 1000, authType: 'admin' });

  const { data: incidentsData, refetch, isLoading, isFetching } = useGetIncidentsQuery({
    page: pagination.page,
    pageSize: pagination.pageSize,
    incidentType: 'incident-report', // Only full incident reports
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: [debouncedSearch, filters.reportedBy, filters.injuredEmployee, filters.project].filter(Boolean).join(' ') || undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true
  });

  const [deleteIncident] = useDeleteIncidentMutation();

  const allData = incidentsData?.incidents || [];
  const paginationInfo = incidentsData?.pagination;

  const clearFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      company: '',
      reportedBy: '',
      injuredEmployee: '',
      project: ''
    });
    setSearchValue('');
    setPagination({ page: 1, pageSize: 10 });
  }, []);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.company || filters.reportedBy || filters.injuredEmployee || filters.project || searchValue;

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize });
  }, []);


  const handleSingleDelete = useCallback(async (id: string) => {
    await deleteIncident({ id, authType: 'admin' });
    refetch();
  }, [deleteIncident, refetch]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      await deleteIncident({ id, authType: 'admin' });
    }
    refetch();
  }, [deleteIncident, refetch]);

  const handleEdit = useCallback((incident: Incident) => {
    setEditingIncident(incident);
  }, []);

  const columns = useMemo<ColumnDef<Incident>[]>(() => [
    {
      accessorKey: 'reportedBy',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('workersComp.table.reportedBy')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('reportedBy')}</div>,
    },
    {
      accessorKey: 'injuredEmployee',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('workersComp.table.injuredEmployee')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('injuredEmployee')}</div>,
    },
    {
      accessorKey: 'projectName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('workersComp.table.projectName')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('projectName')}</div>,
    },
    {
      accessorKey: 'dateReported',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('workersComp.table.dateReported')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{new Date(row.getValue('dateReported')).toLocaleDateString()}</div>,
    },
    {
      accessorKey: 'company',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('workersComp.table.company')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('company')}</div>,
    },
  ], []);

  const filterComponents = useMemo(() => (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <div className="text-xs font-medium">{t('workersComp.filters.injuredEmployee')}</div>
        <Input
          placeholder={t('workersComp.filters.enterEmployeeName')}
          value={filters.injuredEmployee}
          onChange={(e) => setFilters(prev => ({ ...prev, injuredEmployee: e.target.value }))}
          className="w-40 text-xs"
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('workersComp.filters.subcontractorCompany')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-40 justify-between text-xs">
              <span className="truncate">
                {filters.company || t('workersComp.filters.allCompanies')}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, company: '' }))}>
              {t('workersComp.filters.allCompanies')}
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
        <div className="text-xs font-medium">{t('workersComp.filters.reportedBy')}</div>
        <Input
          placeholder={t('workersComp.filters.enterReporterName')}
          value={filters.reportedBy}
          onChange={(e) => setFilters(prev => ({ ...prev, reportedBy: e.target.value }))}
          className="w-40 text-xs"
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('workersComp.filters.dateFrom')}</div>
        <DateInput 
          value={filters.dateFrom}
          onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('workersComp.filters.dateTo')}</div>
        <DateInput 
          value={filters.dateTo}
          onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">{t('workersComp.filters.projectName')}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-40 justify-between text-xs">
              <span className="truncate">
                {filters.project || t('workersComp.filters.allProjects')}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, project: '' }))}>
              {t('workersComp.filters.allProjects')}
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
            {t('workersComp.filters.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  ), [
    filters.injuredEmployee,
    filters.company,
    filters.reportedBy,
    filters.dateFrom, 
    filters.dateTo, 
    filters.project,
    hasActiveFilters, 
    clearFilters,
    subcontractorsData?.subcontractors,
    projectsData?.projects
  ]);

  const getExportData = useCallback((incident: Incident) => {
    return [
      incident.injuredEmployee,
      incident.company,
      incident.reportedBy,
      incident.dateReported,
      incident.projectName
    ];
  }, []);

  const renderMobileCard = useCallback((incident: Incident, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => (
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
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm">{incident.reportedBy}</h3>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">{t('workersComp.mobile.injuredEmployee')}</span> {incident.injuredEmployee}</div>
              <div><span className="font-medium">{t('workersComp.mobile.project')}</span> {incident.projectName}</div>
              <div><span className="font-medium">{t('workersComp.mobile.dateReported')}</span> {new Date(incident.dateReported).toLocaleDateString()}</div>
              <div><span className="font-medium">{t('workersComp.mobile.company')}</span> {incident.company}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleEdit(incident)}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('workersComp.table.edit')}
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('workersComp.table.delete')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('workersComp.dialogs.deleteIncident')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('workersComp.dialogs.deleteIncidentConfirm', { employee: incident.injuredEmployee })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleSingleDelete(incident.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t('workersComp.table.delete')}
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

  // Render create form if creating
  if (isCreatingIncident) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6">
            <CreateIncidentReport 
              onBack={() => setIsCreatingIncident(false)} 
            />
          </div>
        </div>
      </div>
    );
  }

  // Render edit form if editing
  if (editingIncident) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6">
            <IncidentReportEdit 
              submission={editingIncident} 
              onBack={() => setEditingIncident(null)} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Full Incident Reports</h3>
        <Button onClick={() => setIsCreatingIncident(true)} className="bg-blue-600 hover:bg-blue-700">
          Create Full Incident
        </Button>
      </div>
      
      <AdminDataTable
        data={allData}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onDelete={handleSingleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(incident) => incident.id}
        exportFilename="incident_reports"
        exportHeaders={[
          t('workersComp.export.injuredEmployee'), 
          t('workersComp.export.subcontractorCompany'), 
          t('workersComp.export.reportedBy'), 
          t('workersComp.export.dateReported'), 
          t('workersComp.export.projectName')
        ]}
        getExportData={getExportData}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        serverSide={true}
        pagination={paginationInfo || undefined}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}