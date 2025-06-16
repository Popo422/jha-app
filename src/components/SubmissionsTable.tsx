"use client";

import { useMemo, useState } from "react";
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
import { Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Submission } from "@/lib/features/submissions/submissionsApi";

interface SubmissionsTableProps {
  data: Submission[];
  isLoading?: boolean;
}

const getFormTypeLabel = (type: string) => {
  switch (type) {
    case "end-of-day":
      return "End of Day Report";
    case "start-of-day":
      return "Start of Day Report";
    case "job-hazard-analysis":
      return "Job Hazard Analysis";
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
    default:
      return "outline";
  }
};

const formTypeOptions = [
  { value: "end-of-day", label: "End of Day Report" },
  { value: "start-of-day", label: "Start of Day Report" },
  { value: "job-hazard-analysis", label: "Job Hazard Analysis" },
];

export function SubmissionsTable({ data, isLoading }: SubmissionsTableProps) {
  const [selectedFormTypes, setSelectedFormTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter data based on selected form types and search query
  const filteredData = useMemo(() => {
    let filtered = data;
    
    // Filter by form types
    if (selectedFormTypes.length > 0) {
      filtered = filtered.filter((item) => selectedFormTypes.includes(item.submissionType));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => 
        item.jobSite.toLowerCase().includes(query) ||
        item.completedBy.toLowerCase().includes(query) ||
        getFormTypeLabel(item.submissionType).toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [data, selectedFormTypes, searchQuery]);

  const handleFormTypeToggle = (formType: string) => {
    setSelectedFormTypes((prev) =>
      prev.includes(formType) ? prev.filter((type) => type !== formType) : [...prev, formType]
    );
  };

  const clearFilters = () => {
    setSelectedFormTypes([]);
    setSearchQuery("");
  };
  const columns = useMemo<ColumnDef<Submission>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
          const date = row.getValue("date") as string;
          return <div className="text-xs sm:text-sm font-medium">{format(new Date(date), "MMM dd, yyyy")}</div>;
        },
      },
      {
        accessorKey: "submissionType",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("submissionType") as string;
          return (
            <Badge variant={getFormTypeBadgeVariant(type) as any} className="text-xs">
              <span className="hidden sm:inline">{getFormTypeLabel(type)}</span>
              <span className="sm:hidden">
                {type === "end-of-day" ? "EOD" : type === "start-of-day" ? "SOD" : "JHA"}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "jobSite",
        header: "Site",
        cell: ({ row }) => {
          const site = row.getValue("jobSite") as string;
          return <div className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{site}</div>;
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Modified",
        cell: ({ row }) => {
          const date = row.getValue("updatedAt") as string;
          return (
            <div className="text-xs sm:text-sm text-gray-500">
              <div className="hidden sm:block">{format(new Date(date), "MMM dd, yyyy h:mm a")}</div>
              <div className="sm:hidden">{format(new Date(date), "MMM dd")}</div>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Submissions</CardTitle>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filter
                  {selectedFormTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {selectedFormTypes.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Form Types</DropdownMenuLabel>
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

            {(selectedFormTypes.length > 0 || searchQuery.trim()) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          
          <div className="relative max-w-sm w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No submissions found. Start by creating your first form submission.
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b bg-gray-50/50">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="h-8 sm:h-10 px-2 sm:px-4 text-left align-middle font-medium text-gray-500 text-xs sm:text-sm"
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
                        <tr key={row.id} className="border-b hover:bg-gray-50/50 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-2 sm:p-4 align-middle">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="h-16 sm:h-24 text-center text-gray-500 text-sm">
                          {(selectedFormTypes.length > 0 || searchQuery.trim())
                            ? "No submissions match the current filters or search."
                            : "No submissions found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4">
              <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                <span className="hidden sm:inline">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    filteredData.length
                  )}{" "}
                  of {filteredData.length} submissions
                </span>
                <span className="sm:hidden">{filteredData.length} total</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="text-xs"
                >
                  Previous
                </Button>
                <div className="text-xs text-gray-500 px-2">
                  {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
