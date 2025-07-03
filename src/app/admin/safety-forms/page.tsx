"use client";

import { useState, useMemo, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubmissionsQuery, useDeleteSubmissionMutation } from "@/lib/features/submissions/submissionsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import JobHazardAnalysisEdit from "@/components/admin/JobHazardAnalysisEdit";
import StartOfDayEdit from "@/components/admin/StartOfDayEdit";
import EndOfDayEdit from "@/components/admin/EndOfDayEdit";
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

interface Submission {
  id: string;
  userId: string;
  completedBy: string;
  date: string;
  dateTimeClocked?: string;
  company: string;
  jobSite: string;
  submissionType: string;
  formData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const columnHelper = createColumnHelper<Submission>();

export default function SafetyFormsPage() {
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    company: ''
  });
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const queryParams = useMemo(() => ({
    limit: 1000,
    offset: 0,
    type: filters.type || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    company: filters.company || undefined,
    search: debouncedSearch || undefined,
    authType: 'admin' as const
  }), [filters.type, filters.dateFrom, filters.dateTo, filters.company, debouncedSearch]);

  console.log('Safety forms query params:', queryParams);

  const { data: submissionsData, refetch, isLoading, isFetching } = useGetSubmissionsQuery(queryParams, {
    refetchOnMountOrArgChange: true
  });

  const [deleteSubmission] = useDeleteSubmissionMutation();

  const data = submissionsData?.submissions || [];

  const clearFilters = useCallback(() => {
    setFilters({
      type: '',
      dateFrom: '',
      dateTo: '',
      company: ''
    });
    setSearchValue('');
  }, []);

  const hasActiveFilters = filters.type || filters.dateFrom || filters.dateTo || filters.company || searchValue;

  const getSubmissionTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'job-hazard-analysis':
        return 'JHA';
      case 'start-of-day':
        return 'Start of Day';
      case 'end-of-day':
        return 'End of Day';
      default:
        return type;
    }
  }, []);

  const getSubmissionTypeBadgeColor = useCallback((type: string) => {
    switch (type) {
      case 'job-hazard-analysis':
        return 'bg-blue-100 text-blue-800';
      case 'start-of-day':
        return 'bg-green-100 text-green-800';
      case 'end-of-day':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const handleSingleDelete = useCallback(async (id: string) => {
    await deleteSubmission({ id, authType: 'admin' });
    refetch();
  }, [deleteSubmission, refetch]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      await deleteSubmission({ id, authType: 'admin' });
    }
    refetch();
  }, [deleteSubmission, refetch]);

  const handleEdit = useCallback((submission: Submission) => {
    setEditingSubmission(submission);
  }, []);

  const columns = useMemo<ColumnDef<Submission>[]>(() => [
    {
      accessorKey: 'completedBy',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Contractor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue('completedBy')}</div>,
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
      accessorKey: 'submissionType',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('submissionType') as string;
        return (
          <Badge className={`${getSubmissionTypeBadgeColor(type)} text-xs px-2 py-1`}>
            {getSubmissionTypeLabel(type)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        return row.getValue(id) === value;
      },
    },
  ], [getSubmissionTypeLabel, getSubmissionTypeBadgeColor]);

  const filterComponents = useMemo(() => (
    <>
      <div className="space-y-1">
        <div className="text-sm font-medium">Type</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-48 justify-between">
              {filters.type ? getSubmissionTypeLabel(filters.type) : 'All Types'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: ""');
              setFilters(prev => ({ ...prev, type: '' }));
            }}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: job-hazard-analysis');
              setFilters(prev => ({ ...prev, type: 'job-hazard-analysis' }));
            }}>
              Job Hazard Analysis (JHA)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: start-of-day');
              setFilters(prev => ({ ...prev, type: 'start-of-day' }));
            }}>
              Start of Day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Setting type filter to: end-of-day');
              setFilters(prev => ({ ...prev, type: 'end-of-day' }));
            }}>
              End of Day
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
  ), [filters.type, filters.dateFrom, filters.dateTo, getSubmissionTypeLabel, hasActiveFilters, clearFilters]);

  const getExportData = useCallback((submission: Submission) => [
    submission.completedBy,
    submission.company,
    submission.date,
    submission.jobSite,
    submission.submissionType
  ], []);

  const renderMobileCard = useCallback((submission: Submission, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => (
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
              <h3 className="font-medium text-sm">{submission.completedBy}</h3>
              <Badge className={`${getSubmissionTypeBadgeColor(submission.submissionType)} text-xs`}>
                {getSubmissionTypeLabel(submission.submissionType)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">Company:</span> {submission.company}</div>
              <div><span className="font-medium">Date:</span> {new Date(submission.date).toLocaleDateString()}</div>
              <div><span className="font-medium">Job Site:</span> {submission.jobSite}</div>
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
                onClick={() => handleEdit(submission)}
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
                    <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this submission by {submission.completedBy}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleSingleDelete(submission.id)}
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
  ), [getSubmissionTypeBadgeColor, getSubmissionTypeLabel, handleEdit, handleSingleDelete]);

  // Render edit form if editing
  if (editingSubmission) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6">
            {editingSubmission.submissionType === 'job-hazard-analysis' && (
              <JobHazardAnalysisEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
            {editingSubmission.submissionType === 'start-of-day' && (
              <StartOfDayEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
            {editingSubmission.submissionType === 'end-of-day' && (
              <EndOfDayEdit 
                submission={editingSubmission} 
                onBack={() => setEditingSubmission(null)} 
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Safety Forms</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
          Manage and review safety form submissions from contractors
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
        getRowId={(submission) => submission.id}
        exportFilename="safety_forms"
        exportHeaders={['Contractor', 'Company', 'Date', 'Job Site', 'Submission Type']}
        getExportData={getExportData}
        filters={filterComponents}
        renderMobileCard={renderMobileCard}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}