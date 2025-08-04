"use client";

import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Filter, X, Search, ChevronUp, ChevronDown, ChevronsUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { useGetContractorsQuery } from "@/lib/features/contractors/contractorsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { useGetSubcontractorsQuery } from "@/lib/features/subcontractors/subcontractorsApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Submission, useDeleteSubmissionMutation } from "@/lib/features/submissions/submissionsApi";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface SubmissionsTableProps {
  data: Submission[];
  isLoading?: boolean;
  isFetching?: boolean;
  onDelete?: (id: string) => void;
  serverSide?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  filters?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const getFormTypeLabel = (type: string, t: any) => {
  switch (type) {
    case "end-of-day":
      return t('forms.endOfDayReport');
    case "start-of-day":
      return t('forms.startOfDayReport');
    case "job-hazard-analysis":
      return t('forms.jobHazardAnalysis');
    case "incident-report":
      return t('forms.incidentReport');
    default:
      return type;
  }
};

const getFormTypeBadgeVariant = (type: string) => {
  switch (type) {
    case "end-of-day":
      return "destructive";
    case "start-of-day":
      return "default";
    case "job-hazard-analysis":
      return "secondary";
    case "incident-report":
      return "outline";
    default:
      return "outline";
  }
};

const getFormTypeOptions = (t: any) => [
  { value: "end-of-day", label: t('forms.endOfDayReport') },
  { value: "start-of-day", label: t('forms.startOfDayReport') },
  { value: "job-hazard-analysis", label: t('forms.jobHazardAnalysis') },
  { value: "incident-report", label: t('forms.incidentReport') },
];

export function SubmissionsTable({ 
  data, 
  isLoading, 
  isFetching = false,
  onDelete, 
  serverSide = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  filters,
  searchValue = "",
  onSearchChange
}: SubmissionsTableProps) {
  const { t } = useTranslation('common');
  const [selectedFormTypes, setSelectedFormTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteSubmission, { isLoading: isDeleting }] = useDeleteSubmissionMutation();
  const formTypeOptions = getFormTypeOptions(t);
  
  // Use external search if provided, otherwise use internal
  const currentSearchValue = onSearchChange ? searchValue : searchQuery;
  const handleSearchChange = onSearchChange || setSearchQuery;

  // Filter data based on selected form types and search query
  const filteredData = useMemo(() => {
    let filtered = data;

    // Filter by form types
    if (selectedFormTypes.length > 0) {
      filtered = filtered.filter((item) => selectedFormTypes.includes(item.submissionType));
    }

    // Filter by search query (only if not using external filters)
    if (!filters && currentSearchValue.trim()) {
      const query = currentSearchValue.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.projectName.toLowerCase().includes(query) ||
          item.completedBy.toLowerCase().includes(query) ||
          item.date.toLowerCase().includes(query) ||
          getFormTypeLabel(item.submissionType, t).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data, selectedFormTypes, currentSearchValue, filters]);

  const handleFormTypeToggle = (formType: string) => {
    setSelectedFormTypes((prev) =>
      prev.includes(formType) ? prev.filter((type) => type !== formType) : [...prev, formType]
    );
  };

  const clearFilters = () => {
    setSelectedFormTypes([]);
    if (!onSearchChange) {
      setSearchQuery("");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubmission({ id, authType: 'contractor' }).unwrap();
      onDelete?.(id);
    } catch (error) {
      console.error('Failed to delete submission:', error);
    }
  };
  const columns = useMemo<ColumnDef<Submission>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
            >
              {t('tableHeaders.date')}
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-3 w-3" />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = row.getValue("date") as string;
          return <div className="text-xs sm:text-sm font-medium">{format(new Date(date), "MMM dd, yyyy")}</div>;
        },
        sortingFn: "datetime",
      },
      {
        accessorKey: "submissionType",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
            >
              {t('admin.type')}
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-3 w-3" />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const type = row.getValue("submissionType") as string;
          return (
            <Badge variant={getFormTypeBadgeVariant(type) as any} className="text-xs">
              <span className="hidden sm:inline">{getFormTypeLabel(type, t)}</span>
              <span className="sm:hidden">
                {type === "end-of-day" ? "EOD" : type === "start-of-day" ? "SOD" : "JHA"}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "projectName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
            >
              {t('tableHeaders.projectName')}
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-3 w-3" />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const projectName = row.getValue("projectName") as string;
          return <div className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{projectName}</div>;
        },
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
            >
              {t('admin.modified')}
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-3 w-3" />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = row.getValue("updatedAt") as string;
          return (
            <div className="text-xs sm:text-sm text-muted-foreground">
              <div className="hidden sm:block">{format(new Date(date), "MMM dd, yyyy h:mm a")}</div>
              <div className="sm:hidden">{format(new Date(date), "MMM dd")}</div>
            </div>
          );
        },
        sortingFn: "datetime",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const submission = row.original;
          return (
            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin.deleteSubmission')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.deleteSubmissionConfirm', { name: getFormTypeLabel(submission.submissionType, t).toLowerCase() + ' submission for ' + submission.projectName + ' from ' + format(new Date(submission.date), "MMM dd, yyyy") })}
                      <br /><br />
                      <strong>{t('admin.cannotBeUndone')}</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(submission.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [isDeleting],
  );

  const table = useReactTable({
    data: serverSide ? data : filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: serverSide ? undefined : getFilteredRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: serverSide ? undefined : getSortedRowModel(),
    ...(serverSide && pagination ? {
      manualPagination: true,
      pageCount: pagination.totalPages,
    } : {}),
    state: {
      ...(serverSide && pagination ? {
        pagination: {
          pageIndex: pagination.page - 1,
          pageSize: pagination.pageSize,
        },
      } : {}),
    },
    initialState: {
      pagination: {
        pageSize: serverSide ? (pagination?.pageSize || 10) : 10,
      },
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 bg-muted rounded w-16 animate-pulse" />
            </div>
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-8 sm:h-10 px-2 sm:px-4 text-left">
                      <div className="h-4 bg-muted rounded w-12 animate-pulse" />
                    </th>
                    <th className="h-8 sm:h-10 px-2 sm:px-4 text-left">
                      <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                    </th>
                    <th className="h-8 sm:h-10 px-2 sm:px-4 text-left">
                      <div className="h-4 bg-muted rounded w-12 animate-pulse" />
                    </th>
                    <th className="h-8 sm:h-10 px-2 sm:px-4 text-left">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 sm:p-4">
                        <div className="h-4 bg-muted/60 rounded w-20 animate-pulse" />
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="h-6 bg-muted/60 rounded-full w-16 animate-pulse" />
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="h-4 bg-muted/60 rounded w-24 animate-pulse" />
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="h-4 bg-muted/60 rounded w-28 animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        {filters ? (
          <div className="space-y-4">
            {filters}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Filter className="h-4 w-4" />
                      {t('common.filter')}
                      {selectedFormTypes.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                          {selectedFormTypes.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>{t('admin.formTypes')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {formTypeOptions.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selectedFormTypes.includes(option.value)}
                        onCheckedChange={() => handleFormTypeToggle(option.value)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedFormTypes.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                    <X className="h-3 w-3" />
                    {t('admin.clearFilters')}
                  </Button>
                )}
              </div>
              
              <div className="relative max-w-sm w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder={t('admin.searchSubmissions')}
                  value={currentSearchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    {t('common.filter')}
                    {selectedFormTypes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                        {selectedFormTypes.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>{t('admin.formTypes')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {formTypeOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={selectedFormTypes.includes(option.value)}
                      onCheckedChange={() => handleFormTypeToggle(option.value)}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {(selectedFormTypes.length > 0 || currentSearchValue.trim()) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                  <X className="h-3 w-3" />
                  {t('admin.clearFilters')}
                </Button>
              )}
            </div>

            <div className="relative max-w-sm w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder={t('admin.searchSubmissions')}
                value={currentSearchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('admin.noSubmissionsFound')}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b bg-muted/50">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="h-8 sm:h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs sm:text-sm"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-2 sm:p-4 align-middle">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="h-16 sm:h-24 text-center text-muted-foreground text-sm">
                          {selectedFormTypes.length > 0 || searchQuery.trim()
                            ? t('admin.noSubmissionsMatch')
                            : t('admin.noSubmissionsFound')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                {serverSide && pagination ? (
                  <>
                    <span className="hidden sm:inline">
                      {t('admin.showing')} {((pagination.page - 1) * pagination.pageSize) + 1} {t('admin.to')}{" "}
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('admin.of')} {pagination.total} {t('admin.submissions')}
                    </span>
                    <span className="sm:hidden">{pagination.total} {t('admin.total')}</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      {t('admin.showing')} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} {t('admin.to')}{" "}
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        filteredData.length
                      )}{" "}
                      {t('admin.of')} {filteredData.length} {t('admin.submissions')}
                    </span>
                    <span className="sm:hidden">{filteredData.length} {t('admin.total')}</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-center space-x-2">
                {serverSide && pagination && onPageSizeChange && (
                  <div className="flex items-center gap-2 mr-4">
                    <span className="text-xs font-medium">Rows per page:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          {pagination.pageSize}
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {[5, 10, 25, 50].map((pageSize) => (
                          <DropdownMenuItem
                            key={pageSize}
                            onClick={() => onPageSizeChange(pageSize)}
                            className={pagination.pageSize === pageSize ? "bg-accent" : ""}
                          >
                            {pageSize}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (serverSide && onPageChange) {
                      onPageChange(pagination!.page - 1);
                    } else {
                      table.previousPage();
                    }
                  }}
                  disabled={serverSide ? !pagination?.hasPreviousPage : !table.getCanPreviousPage()}
                  className="text-xs"
                >
                  {t('common.previous')}
                </Button>
                <div className="text-xs text-muted-foreground px-2">
                  {serverSide && pagination ? (
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                  ) : (
                    <span>{table.getState().pagination.pageIndex + 1} {t('admin.of')} {table.getPageCount()}</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (serverSide && onPageChange) {
                      onPageChange(pagination!.page + 1);
                    } else {
                      table.nextPage();
                    }
                  }}
                  disabled={serverSide ? !pagination?.hasNextPage : !table.getCanNextPage()}
                  className="text-xs"
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
