"use client";

import { useState, useMemo, useCallback } from "react";
import { useGetSubmissionsQuery, useDeleteSubmissionMutation } from "@/lib/features/submissions/submissionsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  MoreVertical, 
  Download, 
  Trash2, 
  Edit, 
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type Row
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
  const [rowSelection, setRowSelection] = useState({});
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  const { data: submissionsData, refetch, isLoading, isFetching } = useGetSubmissionsQuery({
    limit: 1000,
    offset: 0
  });

  const [deleteSubmission] = useDeleteSubmissionMutation();

  const data = submissionsData?.submissions || [];

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
    await deleteSubmission(id);
    refetch();
  }, [deleteSubmission, refetch]);

  const handleDeleteButtonClick = useCallback(() => {
    if (!showCheckboxes) {
      // First click: show checkboxes
      setShowCheckboxes(true);
    } else {
      const selectedIds = Object.keys(rowSelection);
      if (selectedIds.length === 0) {
        // No items selected: hide checkboxes
        setShowCheckboxes(false);
        setRowSelection({});
      } else {
        // Items selected: delete them
        handleBulkDelete();
      }
    }
  }, [showCheckboxes, rowSelection]);

  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    for (const id of selectedIds) {
      await deleteSubmission(id);
    }
    setRowSelection({});
    setShowCheckboxes(false);
    refetch();
  }, [rowSelection, deleteSubmission, refetch]);

  const handleCancelSelection = useCallback(() => {
    setShowCheckboxes(false);
    setRowSelection({});
  }, []);

  const columns = useMemo<ColumnDef<Submission>[]>(() => {
    const baseColumns: ColumnDef<Submission>[] = [];

    // Only add checkbox column when showCheckboxes is true
    if (showCheckboxes) {
      baseColumns.push({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(value) => table.toggleAllPageRowsSelected(!!value.target.checked)}
            className="w-4 h-4"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(value) => row.toggleSelected(!!value.target.checked)}
            className="w-4 h-4"
          />
        ),
      });
    }

    baseColumns.push(
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
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const submission = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setEditingSubmission(submission)}
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
        );
      },
    });

    return baseColumns;
  }, [showCheckboxes, getSubmissionTypeLabel, getSubmissionTypeBadgeColor, handleSingleDelete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.id,
  });

  const exportToCSV = useCallback(() => {
    const headers = ['Contractor', 'Company', 'Date', 'Job Site', 'Submission Type'];
    const csvData = table.getFilteredRowModel().rows.map(row => [
      row.original.completedBy,
      row.original.company,
      row.original.date,
      row.original.jobSite,
      row.original.submissionType
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safety_forms_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [table]);


  // Skeleton component for loading state
  const TableSkeleton = () => (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {showCheckboxes && (
              <th className="text-left px-3 py-2 font-medium text-sm">
                <Skeleton className="h-4 w-4" />
              </th>
            )}
            <th className="text-left px-3 py-2 font-medium text-sm">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="text-left px-3 py-2 font-medium text-sm">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="text-left px-3 py-2 font-medium text-sm">
              <Skeleton className="h-4 w-16" />
            </th>
            <th className="text-left px-3 py-2 font-medium text-sm">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="text-left px-3 py-2 font-medium text-sm">
              <Skeleton className="h-4 w-16" />
            </th>
            <th className="text-left px-3 py-2 font-medium text-sm">
              <Skeleton className="h-4 w-8" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
              {showCheckboxes && (
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-4" />
                </td>
              )}
              <td className="px-3 py-2">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-4 w-32" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-6 w-6 rounded" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render edit form or table based on editing state
  if (editingSubmission) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
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
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 space-y-4">
          {isFetching && !isLoading && (
            <div className="flex justify-end">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          )}
        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            {/* Submission Type Filter */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Type</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-48 justify-between">
                    {table.getColumn('submissionType')?.getFilterValue() 
                      ? getSubmissionTypeLabel(table.getColumn('submissionType')?.getFilterValue() as string)
                      : "All Types"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => table.getColumn('submissionType')?.setFilterValue('')}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('submissionType')?.setFilterValue('job-hazard-analysis')}>
                    Job Hazard Analysis (JHA)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('submissionType')?.setFilterValue('start-of-day')}>
                    Start of Day
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('submissionType')?.setFilterValue('end-of-day')}>
                    End of Day
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Date From</div>
              <Input
                type="date"
                className="w-40"
                onChange={(e) => {
                  const currentFilter = table.getColumn('date')?.getFilterValue() as [string, string] || ['', ''];
                  table.getColumn('date')?.setFilterValue([e.target.value, currentFilter[1]]);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Date To</div>
              <Input
                type="date"
                className="w-40"
                onChange={(e) => {
                  const currentFilter = table.getColumn('date')?.getFilterValue() as [string, string] || ['', ''];
                  table.getColumn('date')?.setFilterValue([currentFilter[0], e.target.value]);
                }}
              />
            </div>

            {/* Global Search */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Search</div>
              <Input
                placeholder="Search all columns..."
                value={(table.getState().globalFilter as string) ?? ""}
                onChange={(e) => table.setGlobalFilter(String(e.target.value))}
                className="w-64"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-28" />
              </>
            ) : (
              <>
                {showCheckboxes ? (
                  // Show selection-based buttons when checkboxes are visible
                  <>
                    {Object.keys(rowSelection).length > 0 ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({Object.keys(rowSelection).length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Selected Submissions</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {Object.keys(rowSelection).length} selected submission(s)? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button variant="destructive" onClick={handleDeleteButtonClick}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel Selection
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleCancelSelection}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  // Show initial delete button when checkboxes are hidden
                  <Button 
                    variant="outline" 
                    onClick={handleDeleteButtonClick}
                    disabled={table.getFilteredRowModel().rows.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  disabled={table.getFilteredRowModel().rows.length === 0 || isFetching}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="text-left px-3 py-2 font-medium text-sm">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-16 text-center text-sm text-gray-500">
                      No results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            )}
          </div>
          <div className="space-x-2">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}