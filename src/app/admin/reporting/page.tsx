"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, Calendar, Check, XCircle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useGetReportingDataQuery } from '@/lib/features/reporting/reportingApi';
import { useGetTimesheetsQuery } from '@/lib/features/timesheets/timesheetsApi';
import { useGetContractorsQuery } from '@/lib/features/contractors/contractorsApi';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { Employee, ChartDataPoint, ReportingData } from '@/lib/features/reporting/reportingApi';
import type { Timesheet } from '@/lib/features/timesheets/timesheetsApi';
import type { ColumnDef } from '@tanstack/react-table';

export default function ReportingPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [contractorSearch, setContractorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // Default to all statuses

  const { admin } = useSelector((state: RootState) => state.auth);

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Use Redux query with skip when data not ready
  const { 
    data, 
    isLoading, 
    isFetching, 
    error 
  } = useGetReportingDataQuery(
    {
      companyId: admin?.companyId || '',
      startDate,
      endDate,
      employeeIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
    },
    {
      skip: !admin?.companyId || !startDate || !endDate,
    }
  );

  // Get contractors data for filtering
  const { 
    data: contractorsData, 
    isLoading: contractorsLoading 
  } = useGetContractorsQuery({
    limit: 1000 // Get all contractors
  });

  // Create search string for contractor filtering
  const contractorSearchString = useMemo(() => {
    if (selectedContractors.length === 0) return search;
    
    const contractorNames = contractorsData?.contractors
      .filter(contractor => selectedContractors.includes(contractor.id))
      .map(contractor => `${contractor.firstName} ${contractor.lastName}`)
      .join('|') || '';
    
    // Combine search with contractor names
    const searchTerms = [search, contractorNames].filter(Boolean);
    return searchTerms.join(' ');
  }, [search, selectedContractors, contractorsData?.contractors]);

  // Get timesheets data
  const { 
    data: timesheetData, 
    isLoading: timesheetLoading, 
    isFetching: timesheetFetching 
  } = useGetTimesheetsQuery({
    dateFrom: startDate || undefined,
    dateTo: endDate || undefined,
    search: contractorSearchString || undefined,
    status: statusFilter || undefined,
    authType: 'admin'
  });

  // Get filtered timesheets from API (no frontend filtering needed)
  const filteredTimesheets = timesheetData?.timesheets || [];

  // Calculate totals only from approved timesheets for summary cards
  const approvedTimesheets = useMemo(() => {
    if (!timesheetData?.timesheets) return [];
    return timesheetData.timesheets.filter(timesheet => timesheet.status === 'approved');
  }, [timesheetData?.timesheets]);

  // Create chart data from approved timesheets only
  const chartData = useMemo(() => {
    if (!approvedTimesheets.length) return [];
    
    const dateMap = new Map<string, number>();
    
    approvedTimesheets.forEach(timesheet => {
      const date = timesheet.date;
      const hours = parseFloat(timesheet.timeSpent) || 0;
      dateMap.set(date, (dateMap.get(date) || 0) + hours);
    });
    
    return Array.from(dateMap.entries())
      .map(([date, totalHours]) => ({
        date,
        totalHours
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [approvedTimesheets]);

  const statusFilterText = useMemo(() => {
    switch (statusFilter) {
      case 'all': return 'All Statuses';
      case 'approved': return 'Approved Only';
      case 'pending': return 'Pending Only';
      case 'rejected': return 'Rejected Only';
      default: return 'All Statuses';
    }
  }, [statusFilter]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleContractorToggle = (contractorId: string) => {
    setSelectedContractors(prev => 
      prev.includes(contractorId) 
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const exportToCSV = () => {
    if (!chartData.length) return;
    
    const csvData = chartData.map(item => [
      item.date,
      item.totalHours.toString()
    ]);

    const csvContent = [
      ['Date', 'Total Approved Hours'],
      ...csvData
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approved_hours_report_${startDate}_to_${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const totalHours = useMemo(() => {
    return approvedTimesheets.reduce((sum, timesheet) => sum + parseFloat(timesheet.timeSpent), 0);
  }, [approvedTimesheets]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const selectedEmployeeNames = useMemo(() => {
    if (!data) return [];
    return data.employees
      .filter(emp => selectedEmployees.includes(emp.id))
      .map(emp => emp.name);
  }, [data?.employees, selectedEmployees]);

  const selectedContractorNames = useMemo(() => {
    if (!contractorsData) return [];
    return contractorsData.contractors
      .filter(contractor => selectedContractors.includes(contractor.id))
      .map(contractor => `${contractor.firstName} ${contractor.lastName}`);
  }, [contractorsData?.contractors, selectedContractors]);

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    if (!employeeSearch) return data.employees;
    return data.employees.filter(employee => 
      employee.name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [data?.employees, employeeSearch]);

  // Filtered contractors for search
  const filteredContractors = useMemo(() => {
    if (!contractorsData?.contractors) return [];
    if (!contractorSearch) return contractorsData.contractors;
    return contractorsData.contractors.filter(contractor => 
      `${contractor.firstName} ${contractor.lastName}`.toLowerCase().includes(contractorSearch.toLowerCase())
    );
  }, [contractorsData?.contractors, contractorSearch]);

  const formatTimeSpent = (timeSpent: string) => {
    const hours = parseFloat(timeSpent);
    if (hours === 1) return "1 hr";
    return `${hours} hrs`;
  };

  const timesheetColumns: ColumnDef<Timesheet>[] = useMemo(() => [
    {
      accessorKey: "employee",
      header: "Name",
      cell: ({ row }) => (
        <div>{row.getValue("employee")}</div>
      ),
    },
    {
      accessorKey: "jobName",
      header: "Project Name",
      cell: ({ row }) => (
        <div>{row.getValue("jobName") || "N/A"}</div>
      ),
    },
    {
      accessorKey: "timeSpent",
      header: "Time Spent",
      cell: ({ row }) => (
        <div>
          {formatTimeSpent(row.getValue("timeSpent"))}
        </div>
      ),
    },
    {
      accessorKey: "company",
      header: "Company Name",
      cell: ({ row }) => (
        <div>{row.getValue("company")}</div>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <div>
          {new Date(row.getValue("date")).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "jobSite",
      header: "Job Site",
      cell: ({ row }) => (
        <div>{row.getValue("jobSite")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
  ], []);

  const timesheetFilters = useMemo(() => (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="space-y-1">
        <div className="text-sm font-medium">From Date</div>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full md:w-40"
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">To Date</div>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full md:w-40"
        />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Status</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-48 justify-between">
              {statusFilterText}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onSelect={() => setStatusFilter('all')}
              className="cursor-pointer"
            >
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setStatusFilter('approved')}
              className="cursor-pointer"
            >
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Approved Only
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setStatusFilter('pending')}
              className="cursor-pointer"
            >
              <Clock className="w-4 h-4 mr-2 text-gray-600" />
              Pending Only
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => setStatusFilter('rejected')}
              className="cursor-pointer"
            >
              <XCircle className="w-4 h-4 mr-2 text-red-600" />
              Rejected Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Contractors</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-64 justify-between">
              {selectedContractors.length === 0 
                ? "All Contractors" 
                : selectedContractors.length === 1
                  ? selectedContractorNames[0]
                  : `${selectedContractors.length} contractors selected`
              }
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <div className="p-2">
              <Input
                placeholder="Search contractors..."
                className="w-full"
                value={contractorSearch}
                onChange={(e) => {
                  setContractorSearch(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
            <DropdownMenuItem
              onClick={() => setSelectedContractors([])}
              className="cursor-pointer"
            >
              All Contractors
            </DropdownMenuItem>
            <div className="max-h-48 overflow-y-auto">
              {filteredContractors.map((contractor) => (
                <DropdownMenuCheckboxItem
                  key={contractor.id}
                  checked={selectedContractors.includes(contractor.id)}
                  onCheckedChange={() => handleContractorToggle(contractor.id)}
                >
                  {contractor.firstName} {contractor.lastName}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ), [startDate, endDate, selectedContractors, selectedContractorNames, filteredContractors, contractorSearch, statusFilterText]);

  const renderMobileCard = useCallback((timesheet: Timesheet, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          {showCheckboxes && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 mt-1 mr-3"
            />
          )}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-lg">{timesheet.employee}</div>
                <div className="text-sm text-gray-600">{timesheet.company}</div>
              </div>
              <Badge variant="secondary">
                {formatTimeSpent(timesheet.timeSpent)}
              </Badge>
            </div>
            
            <div className="space-y-1 mb-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Project:</span>
                <span className="text-sm">{timesheet.jobName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Date:</span>
                <span className="text-sm">{new Date(timesheet.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Job Site:</span>
                <span className="text-sm">{timesheet.jobSite}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Status:</span>
                {getStatusBadge(timesheet.status)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ), []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Hours Reporting</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 space-y-4">
          
          {/* Filters Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="space-y-1">
              <div className="text-sm font-medium">Start Date</div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full md:w-40"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">End Date</div>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full md:w-40"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Employees</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-64 justify-between">
                    {selectedEmployees.length === 0 
                      ? "All Employees" 
                      : selectedEmployees.length === 1
                        ? selectedEmployeeNames[0]
                        : `${selectedEmployees.length} employees selected`
                    }
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <div className="p-2">
                    <Input
                      placeholder="Search employees..."
                      className="w-full"
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                      }}
                    />
                  </div>
                  <DropdownMenuItem
                    onClick={() => setSelectedEmployees([])}
                    className="cursor-pointer"
                  >
                    All Employees
                  </DropdownMenuItem>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredEmployees.map((employee) => (
                      <DropdownMenuCheckboxItem
                        key={employee.id}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleEmployeeToggle(employee.id)}
                      >
                        {employee.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={chartData.length === 0 || timesheetFetching}
              className="md:ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Approved Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {timesheetLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Approved Entries
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {timesheetLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{approvedTimesheets.length || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Hours/Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {timesheetLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {approvedTimesheets.length > 0 ? (totalHours / approvedTimesheets.length).toFixed(1) : '0.0'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chart Section */}
          <Card>
            <CardHeader>
              <CardTitle>Hours Worked Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {timesheetLoading || timesheetFetching ? (
                <div className="h-80 flex items-center justify-center">
                  <Skeleton className="h-80 w-full" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No approved timesheets available for the selected date range
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Total Hours']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString();
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="totalHours" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Total Hours"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Timesheet Details</h2>
        <AdminDataTable
          data={filteredTimesheets}
          columns={timesheetColumns}
          isLoading={timesheetLoading}
          isFetching={timesheetFetching}
          getRowId={(timesheet) => timesheet.id}
          exportFilename="timesheets"
          exportHeaders={["Name", "Project Name", "Time Spent", "Company Name", "Date", "Job Site", "Status"]}
          getExportData={(timesheet) => [
            timesheet.employee,
            timesheet.jobName || "N/A",
            formatTimeSpent(timesheet.timeSpent),
            timesheet.company,
            new Date(timesheet.date).toLocaleDateString(),
            timesheet.jobSite,
            timesheet.status
          ]}
          searchValue={search}
          onSearchChange={setSearch}
          renderMobileCard={renderMobileCard}
          filters={timesheetFilters}
        />
      </div>
    </div>
  );
}