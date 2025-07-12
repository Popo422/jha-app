"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
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
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedJobNames, setSelectedJobNames] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [contractorSearch, setContractorSearch] = useState('');
  const [jobNameSearch, setJobNameSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // Default to all statuses
  const [activeTab, setActiveTab] = useState('hours'); // 'hours' or 'cost'
  const [contractorCostSearch, setContractorCostSearch] = useState('');
  const [companyCostSearch, setCompanyCostSearch] = useState('');
  const [jobSiteCostSearch, setJobSiteCostSearch] = useState('');
  
  // Debounced search values to prevent excessive filtering
  const debouncedContractorCostSearch = useDebouncedValue(contractorCostSearch, 300);
  const debouncedCompanyCostSearch = useDebouncedValue(companyCostSearch, 300);
  const debouncedJobSiteCostSearch = useDebouncedValue(jobSiteCostSearch, 300);

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

  // Create employees filter string for contractor filtering
  const employeesFilterString = useMemo(() => {
    if (selectedContractors.length === 0) return undefined;
    
    const contractorNames = contractorsData?.contractors
      .filter(contractor => selectedContractors.includes(contractor.id))
      .map(contractor => `${contractor.firstName} ${contractor.lastName}`)
      .join('|') || '';
    
    return contractorNames || undefined;
  }, [selectedContractors, contractorsData?.contractors]);

  // Create job name filter string
  const jobNameFilterString = useMemo(() => {
    if (selectedJobNames.length === 0) return undefined;
    return selectedJobNames.join('|');
  }, [selectedJobNames]);

  // Get timesheets data
  const { 
    data: timesheetData, 
    isLoading: timesheetLoading, 
    isFetching: timesheetFetching 
  } = useGetTimesheetsQuery({
    dateFrom: startDate || undefined,
    dateTo: endDate || undefined,
    search: search || undefined,
    employees: employeesFilterString,
    jobName: jobNameFilterString,
    status: statusFilter || undefined,
    authType: 'admin'
  });

  // Get filtered timesheets from API (no frontend filtering needed)
  const filteredTimesheets = timesheetData?.timesheets || [];
  const contractorRates = timesheetData?.contractorRates || {};

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

  // Cost calculations
  const getCost = useCallback((timesheet: any) => {
    const timeSpent = parseFloat(timesheet.timeSpent || '0');
    const rate = parseFloat(contractorRates[timesheet.userId] || '0');
    return timeSpent * rate;
  }, [contractorRates]);

  // Hours worked by contractor
  const contractorHours = useMemo(() => {
    const hoursMap = new Map<string, { name: string; hours: number; cost: number }>();
    
    approvedTimesheets.forEach(timesheet => {
      const hours = parseFloat(timesheet.timeSpent || '0');
      const cost = getCost(timesheet);
      const existing = hoursMap.get(timesheet.employee) || { name: timesheet.employee, hours: 0, cost: 0 };
      hoursMap.set(timesheet.employee, {
        name: timesheet.employee,
        hours: existing.hours + hours,
        cost: existing.cost + cost
      });
    });
    
    return Array.from(hoursMap.values()).sort((a, b) => b.hours - a.hours);
  }, [approvedTimesheets, getCost]);

  // Company analytics
  const companyAnalytics = useMemo(() => {
    const companyMap = new Map<string, { name: string; hours: number; cost: number; contractors: Set<string> }>();
    
    approvedTimesheets.forEach(timesheet => {
      const hours = parseFloat(timesheet.timeSpent || '0');
      const cost = getCost(timesheet);
      const existing = companyMap.get(timesheet.company) || { 
        name: timesheet.company, 
        hours: 0, 
        cost: 0, 
        contractors: new Set() 
      };
      existing.contractors.add(timesheet.employee);
      companyMap.set(timesheet.company, {
        name: timesheet.company,
        hours: existing.hours + hours,
        cost: existing.cost + cost,
        contractors: existing.contractors
      });
    });
    
    return Array.from(companyMap.values()).sort((a, b) => b.cost - a.cost);
  }, [approvedTimesheets, getCost]);

  // Job site analytics
  const jobSiteAnalytics = useMemo(() => {
    const jobSiteMap = new Map<string, { name: string; hours: number; cost: number }>();
    
    approvedTimesheets.forEach(timesheet => {
      const hours = parseFloat(timesheet.timeSpent || '0');
      const cost = getCost(timesheet);
      const existing = jobSiteMap.get(timesheet.jobSite) || { name: timesheet.jobSite, hours: 0, cost: 0 };
      jobSiteMap.set(timesheet.jobSite, {
        name: timesheet.jobSite,
        hours: existing.hours + hours,
        cost: existing.cost + cost
      });
    });
    
    return Array.from(jobSiteMap.values()).sort((a, b) => b.cost - a.cost);
  }, [approvedTimesheets, getCost]);

  // Accumulated spend over time
  const accumulatedSpendData = useMemo(() => {
    if (!approvedTimesheets.length) return [];
    
    const dateMap = new Map<string, number>();
    
    approvedTimesheets.forEach(timesheet => {
      const cost = getCost(timesheet);
      const date = timesheet.date;
      dateMap.set(date, (dateMap.get(date) || 0) + cost);
    });
    
    const sortedData = Array.from(dateMap.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    
    let accumulated = 0;
    return sortedData.map(([date, dailyCost]) => {
      accumulated += dailyCost;
      return {
        date,
        dailyCost,
        accumulatedCost: accumulated
      };
    });
  }, [approvedTimesheets, getCost]);

  // Daily spend data for bar chart
  const dailySpendData = useMemo(() => {
    if (!approvedTimesheets.length) return [];
    
    const dateMap = new Map<string, number>();
    
    approvedTimesheets.forEach(timesheet => {
      const cost = getCost(timesheet);
      const date = timesheet.date;
      dateMap.set(date, (dateMap.get(date) || 0) + cost);
    });
    
    return Array.from(dateMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [approvedTimesheets, getCost]);

  // Total calculations
  const totalCost = useMemo(() => {
    return approvedTimesheets.reduce((sum, timesheet) => sum + getCost(timesheet), 0);
  }, [approvedTimesheets, getCost]);

  // Filtered analytics data for search - using debounced values for better performance
  const filteredContractorHours = useMemo(() => {
    if (!debouncedContractorCostSearch) return contractorHours;
    const searchTerm = debouncedContractorCostSearch.toLowerCase();
    return contractorHours.filter(contractor =>
      contractor.name.toLowerCase().includes(searchTerm) ||
      contractor.hours.toFixed(1).includes(searchTerm) ||
      contractor.cost.toFixed(2).includes(searchTerm)
    );
  }, [contractorHours, debouncedContractorCostSearch]);

  const filteredCompanyAnalytics = useMemo(() => {
    if (!debouncedCompanyCostSearch) return companyAnalytics;
    const searchTerm = debouncedCompanyCostSearch.toLowerCase();
    return companyAnalytics.filter(company =>
      company.name.toLowerCase().includes(searchTerm) ||
      company.hours.toFixed(1).includes(searchTerm) ||
      company.cost.toFixed(2).includes(searchTerm) ||
      company.contractors.size.toString().includes(searchTerm)
    );
  }, [companyAnalytics, debouncedCompanyCostSearch]);

  const filteredJobSiteAnalytics = useMemo(() => {
    if (!debouncedJobSiteCostSearch) return jobSiteAnalytics;
    const searchTerm = debouncedJobSiteCostSearch.toLowerCase();
    return jobSiteAnalytics.filter(jobSite =>
      jobSite.name.toLowerCase().includes(searchTerm) ||
      jobSite.hours.toFixed(1).includes(searchTerm) ||
      jobSite.cost.toFixed(2).includes(searchTerm)
    );
  }, [jobSiteAnalytics, debouncedJobSiteCostSearch]);

  const statusFilterText = useMemo(() => {
    switch (statusFilter) {
      case 'all': return 'All Statuses';
      case 'approved': return 'Approved Only';
      case 'pending': return 'Pending Only';
      case 'rejected': return 'Rejected Only';
      default: return 'All Statuses';
    }
  }, [statusFilter]);


  const handleContractorToggle = (contractorId: string) => {
    setSelectedContractors(prev => 
      prev.includes(contractorId) 
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const handleJobNameToggle = (jobName: string) => {
    setSelectedJobNames(prev => 
      prev.includes(jobName) 
        ? prev.filter(name => name !== jobName)
        : [...prev, jobName]
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


  const selectedContractorNames = useMemo(() => {
    if (!contractorsData) return [];
    return contractorsData.contractors
      .filter(contractor => selectedContractors.includes(contractor.id))
      .map(contractor => `${contractor.firstName} ${contractor.lastName}`);
  }, [contractorsData?.contractors, selectedContractors]);

  // Get unique job names from timesheet data
  const uniqueJobNames = useMemo(() => {
    if (!timesheetData?.timesheets) return [];
    const jobNames = new Set<string>();
    timesheetData.timesheets.forEach(timesheet => {
      if (timesheet.jobName && timesheet.jobName.trim()) {
        jobNames.add(timesheet.jobName.trim());
      }
    });
    return Array.from(jobNames).sort();
  }, [timesheetData?.timesheets]);


  // Filtered contractors for search
  const filteredContractors = useMemo(() => {
    if (!contractorsData?.contractors) return [];
    if (!contractorSearch) return contractorsData.contractors;
    return contractorsData.contractors.filter(contractor => 
      `${contractor.firstName} ${contractor.lastName}`.toLowerCase().includes(contractorSearch.toLowerCase())
    );
  }, [contractorsData?.contractors, contractorSearch]);

  // Filtered job names for search
  const filteredJobNames = useMemo(() => {
    if (!uniqueJobNames.length) return [];
    if (!jobNameSearch) return uniqueJobNames;
    return uniqueJobNames.filter(jobName => 
      jobName.toLowerCase().includes(jobNameSearch.toLowerCase())
    );
  }, [uniqueJobNames, jobNameSearch]);

  const formatTimeSpent = (timeSpent: string) => {
    const hours = parseFloat(timeSpent);
    if (hours === 1) return "1 hr";
    return `${hours} hrs`;
  };

  // Color palette for charts
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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

  // Memoized column definitions to prevent re-renders
  const contractorCostColumns = useMemo<ColumnDef<{name: string; hours: number; cost: number}>[]>(() => [
    {
      accessorKey: "name",
      header: "Contractor Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "hours",
      header: "Total Hours",
      cell: ({ row }) => <div>{(row.getValue("hours") as number).toFixed(1)} hrs</div>,
    },
    {
      accessorKey: "cost",
      header: "Total Cost",
      cell: ({ row }) => <div className="font-semibold text-green-600">${(row.getValue("cost") as number).toFixed(2)}</div>,
    },
  ], []);

  const companyCostColumns = useMemo<ColumnDef<{name: string; hours: number; cost: number; contractors: Set<string>}>[]>(() => [
    {
      accessorKey: "name",
      header: "Company Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "hours",
      header: "Total Hours",
      cell: ({ row }) => <div>{(row.getValue("hours") as number).toFixed(1)} hrs</div>,
    },
    {
      accessorKey: "cost",
      header: "Total Cost",
      cell: ({ row }) => <div className="font-semibold text-green-600">${(row.getValue("cost") as number).toFixed(2)}</div>,
    },
    {
      id: "contractors",
      header: "Contractors",
      cell: ({ row }) => {
        const contractors = row.original.contractors;
        return <div>{contractors.size} contractor{contractors.size !== 1 ? 's' : ''}</div>;
      },
    },
  ], []);

  const jobSiteCostColumns = useMemo<ColumnDef<{name: string; hours: number; cost: number}>[]>(() => [
    {
      accessorKey: "name",
      header: "Job Site",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "hours",
      header: "Total Hours",
      cell: ({ row }) => <div>{(row.getValue("hours") as number).toFixed(1)} hrs</div>,
    },
    {
      accessorKey: "cost",
      header: "Total Cost",
      cell: ({ row }) => <div className="font-semibold text-green-600">${(row.getValue("cost") as number).toFixed(2)}</div>,
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
      <div className="space-y-1">
        <div className="text-sm font-medium">Projects</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-64 justify-between">
              {selectedJobNames.length === 0 
                ? "All Projects" 
                : selectedJobNames.length === 1
                  ? selectedJobNames[0]
                  : `${selectedJobNames.length} projects selected`
              }
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <div className="p-2">
              <Input
                placeholder="Search projects..."
                className="w-full"
                value={jobNameSearch}
                onChange={(e) => {
                  setJobNameSearch(e.target.value);
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
              onClick={() => setSelectedJobNames([])}
              className="cursor-pointer"
            >
              All Projects
            </DropdownMenuItem>
            <div className="max-h-48 overflow-y-auto">
              {filteredJobNames.map((jobName) => (
                <DropdownMenuCheckboxItem
                  key={jobName}
                  checked={selectedJobNames.includes(jobName)}
                  onCheckedChange={() => handleJobNameToggle(jobName)}
                >
                  {jobName}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ), [startDate, endDate, selectedContractors, selectedContractorNames, filteredContractors, contractorSearch, selectedJobNames, filteredJobNames, jobNameSearch, statusFilterText]);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {activeTab === 'hours' ? 'Time Reports' : 'Cost Reports'}
        </h1>
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

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('hours')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'hours'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Time Reports
            </button>
            <button
              onClick={() => setActiveTab('cost')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'cost'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Cost Reports
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'hours' && (
            <>
              {/* Hours Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
              </div>

              {/* Hours Chart */}
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

              {/* Hours-focused Analytics */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hours Analytics</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hours by Contractor Chart */}
                  <Card className="w-full mx-auto h-fit p-2 gap-4 flex flex-col justify-center items-center">
                    <CardHeader>
                      <CardTitle>Hours Worked by Contractor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timesheetLoading || timesheetFetching ? (
                        <div className="h-80 flex items-center justify-center">
                          <Skeleton className="h-80 w-full" />
                        </div>
                      ) : contractorHours.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                          No contractor data available
                        </div>
                      ) : (
                        <div className="h-80 flex justify-center items-center">
                          <div style={{ width: Math.min(contractorHours.length * 120 + 100, 600), height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={contractorHours.slice(0, 10)} 
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                              >
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }} 
                                domain={[0, 'dataMax']}
                                tickFormatter={(value) => `${value}h`}
                              />
                              <Tooltip 
                                formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Hours Worked']}
                                labelFormatter={(label) => `Contractor: ${label}`}
                              />
                              <Bar 
                                dataKey="hours" 
                                fill="#3b82f6" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={80}
                              />
                            </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Company Hours Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Hours per Company</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timesheetLoading || timesheetFetching ? (
                        <div className="h-80 flex items-center justify-center">
                          <Skeleton className="h-80 w-full" />
                        </div>
                      ) : companyAnalytics.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                          No company data available
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={companyAnalytics}
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="hours"
                                label={({ name, hours }) => `${name}: ${hours.toFixed(1)}h`}
                              >
                                {companyAnalytics.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Total Hours']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {activeTab === 'cost' && (
            <>
              {/* Cost Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Project Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {timesheetLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-bold text-green-600">${totalCost.toFixed(2)}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Avg Cost/Hour
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {timesheetLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-bold">
                        ${totalHours > 0 ? (totalCost / totalHours).toFixed(2) : '0.00'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Cost Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Accumulated Spend Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Accumulated Spend Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timesheetLoading || timesheetFetching ? (
                      <div className="h-80 flex items-center justify-center">
                        <Skeleton className="h-80 w-full" />
                      </div>
                    ) : accumulatedSpendData.length === 0 ? (
                      <div className="h-80 flex items-center justify-center text-gray-500">
                        No cost data available for the selected date range
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={accumulatedSpendData}>
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
                              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Accumulated Cost']}
                              labelFormatter={(label) => {
                                const date = new Date(label);
                                return date.toLocaleDateString();
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="accumulatedCost" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Accumulated Cost"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Project Spend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Project Spend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timesheetLoading || timesheetFetching ? (
                      <div className="h-80 flex items-center justify-center">
                        <Skeleton className="h-80 w-full" />
                      </div>
                    ) : dailySpendData.length === 0 ? (
                      <div className="h-80 flex items-center justify-center text-gray-500">
                        No cost data available for the selected date range
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dailySpendData}>
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
                              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Daily Cost']}
                              labelFormatter={(label) => {
                                const date = new Date(label);
                                return date.toLocaleDateString();
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="cost" 
                              fill="#3b82f6"
                              name="Daily Cost"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Cost-focused Analytics */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cost Analytics</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Contractor Cost Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost per Contractor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AdminDataTable
                        data={filteredContractorHours}
                        columns={contractorCostColumns}
                        isLoading={timesheetLoading}
                        isFetching={timesheetFetching}
                        getRowId={(item) => item.name}
                        exportFilename="contractor_costs"
                        exportHeaders={["Contractor Name", "Total Hours", "Total Cost"]}
                        getExportData={(item) => [
                          item.name,
                          `${item.hours.toFixed(1)} hrs`,
                          `$${item.cost.toFixed(2)}`
                        ]}
                        searchValue={contractorCostSearch}
                        onSearchChange={setContractorCostSearch}
                      />
                    </CardContent>
                  </Card>

                  {/* Company Cost Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost per Company</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timesheetLoading || timesheetFetching ? (
                        <div className="h-80 flex items-center justify-center">
                          <Skeleton className="h-80 w-full" />
                        </div>
                      ) : companyAnalytics.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                          No company data available
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={companyAnalytics}
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="cost"
                                label={({ name, cost }) => `${name}: $${cost.toFixed(0)}`}
                              >
                                {companyAnalytics.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Total Cost']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Job Site Cost Analytics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cost per Job Site</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdminDataTable
                      data={filteredJobSiteAnalytics}
                      columns={jobSiteCostColumns}
                      isLoading={timesheetLoading}
                      isFetching={timesheetFetching}
                      getRowId={(item) => item.name}
                      exportFilename="jobsite_costs"
                      exportHeaders={["Job Site", "Total Hours", "Total Cost"]}
                      getExportData={(item) => [
                        item.name,
                        `${item.hours.toFixed(1)} hrs`,
                        `$${item.cost.toFixed(2)}`
                      ]}
                      searchValue={jobSiteCostSearch}
                      onSearchChange={setJobSiteCostSearch}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
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