"use client";

import { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Users, 
  Clock,
  Building
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface SubcontractorHoursData {
  subcontractor: string;
  foreman: string;
  totalHours: number;
  uniqueEmployees: number;
  entriesCount: number;
  avgHoursPerEmployee: number;
  projectsList: string;
  latestDate: string;
}

interface AllSubcontractorsData {
  subcontractor: string;
  foreman: string;
  totalHours: number;
  totalCost: number;
  uniqueContractors: number;
  entriesCount: number;
  avgCostPerHour: number;
}

interface SubcontractorHoursSummary {
  totalHours: number;
  totalSubcontractors: number;
  avgHoursPerSubcontractor: number;
  topSubcontractor: {
    name: string;
    hours: number;
    employees: number;
  } | null;
}

interface SubcontractorHoursResponse {
  subcontractorHours: SubcontractorHoursData[];
  summary: SubcontractorHoursSummary;
  filters: {
    project: string | null;
    subcontractor: string | null;
  };
}

interface AllSubcontractorsResponse {
  allSubcontractors: AllSubcontractorsData[];
  summary: {
    totalHours: number;
    totalCost: number;
    totalSubcontractors: number;
    avgCostPerSubcontractor: number;
    avgCostPerHour: number;
    topSubcontractor: {
      name: string;
      hours: number;
      cost: number;
    } | null;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface SubcontractorHoursAnalyticsProps {
  companyId: string;
  projectFilter?: string;
  subcontractorFilter?: string;
  className?: string;
}

// Colors for pie chart
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export default function SubcontractorHoursAnalytics({ 
  companyId, 
  projectFilter, 
  subcontractorFilter, 
  className = '' 
}: SubcontractorHoursAnalyticsProps) {
  const [data, setData] = useState<SubcontractorHoursResponse | null>(null);
  const [allSubcontractorsData, setAllSubcontractorsData] = useState<AllSubcontractorsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allSubcontractorsSearch, setAllSubcontractorsSearch] = useState('');
  const [allSubcontractorsPagination, setAllSubcontractorsPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [prefetchedPages, setPrefetchedPages] = useState<Map<string, AllSubcontractorsResponse>>(new Map());
  const debouncedAllSubcontractorsSearch = useDebouncedValue(allSubcontractorsSearch, 300);

  // Fetch subcontractor hours data
  const fetchSubcontractorHours = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        companyId
      });
      
      if (projectFilter) {
        params.append('project', projectFilter);
      }
      
      if (subcontractorFilter) {
        params.append('subcontractor', subcontractorFilter);
      }

      const response = await fetch(`/api/admin/project-snapshot/subcontractor-hours?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subcontractor hours data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching subcontractor hours data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to create cache key
  const getCacheKey = (page: number, pageSize: number, search: string) => {
    return `${page}-${pageSize}-${search}`;
  };

  // Prefetch pages in background
  const prefetchPage = async (page: number, pageSize: number, search: string) => {
    if (!companyId) return;
    
    const cacheKey = getCacheKey(page, pageSize, search);
    if (prefetchedPages.has(cacheKey)) return; // Already prefetched
    
    try {
      const params = new URLSearchParams({
        companyId,
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (search.trim()) {
        params.append('search', search);
      }

      const response = await fetch(`/api/admin/project-snapshot/all-subcontractors?${params}`);
      if (!response.ok) return; // Silently fail prefetch
      
      const result = await response.json();
      setPrefetchedPages(prev => new Map(prev).set(cacheKey, result));
    } catch (error) {
      // Silently fail prefetch
    }
  };

  // Fetch all subcontractors data with server-side pagination and caching
  const fetchAllSubcontractors = async () => {
    if (!companyId) return;
    
    // If there's a project filter, use the subcontractor-hours endpoint which respects project filtering
    if (projectFilter) {
      setIsLoadingAll(true);
      try {
        const params = new URLSearchParams({
          companyId,
          project: projectFilter
        });

        if (subcontractorFilter) {
          params.append('subcontractor', subcontractorFilter);
        }

        const response = await fetch(`/api/admin/project-snapshot/subcontractor-hours?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project subcontractors data');
        }
        
        const result = await response.json();
        
        // Transform the subcontractor-hours data to match the all-subcontractors format
        // Filter out subcontractors with 0 hours when project filter is applied
        const filteredSubcontractors = result.subcontractorHours.filter((item: any) => item.totalHours > 0);
        
        const transformedData = {
          allSubcontractors: filteredSubcontractors.map((item: any) => ({
            subcontractor: item.subcontractor,
            foreman: item.foreman,
            totalHours: item.totalHours,
            totalCost: item.totalHours * 15, // Estimate cost since subcontractor-hours doesn't have cost
            uniqueContractors: item.uniqueEmployees,
            entriesCount: item.entriesCount,
            avgCostPerHour: 15 // Estimate
          })),
          summary: {
            totalHours: result.summary.totalHours,
            totalCost: result.summary.totalHours * 15,
            totalSubcontractors: filteredSubcontractors.length,
            avgCostPerSubcontractor: filteredSubcontractors.length > 0 ? (result.summary.totalHours * 15) / filteredSubcontractors.length : 0,
            avgCostPerHour: 15,
            topSubcontractor: filteredSubcontractors.length > 0 ? {
              name: filteredSubcontractors[0].subcontractor,
              hours: filteredSubcontractors[0].totalHours,
              cost: filteredSubcontractors[0].totalHours * 15
            } : null
          },
          pagination: {
            page: 1,
            pageSize: filteredSubcontractors.length,
            total: filteredSubcontractors.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
        
        setAllSubcontractorsData(transformedData);
      } catch (error) {
        console.error('Error fetching project subcontractors data:', error);
      } finally {
        setIsLoadingAll(false);
      }
      return;
    }
    
    // Original logic for when no project filter is applied
    const cacheKey = getCacheKey(allSubcontractorsPagination.currentPage, allSubcontractorsPagination.pageSize, debouncedAllSubcontractorsSearch);
    
    // Check if we have this page cached
    if (prefetchedPages.has(cacheKey)) {
      const cachedData = prefetchedPages.get(cacheKey);
      if (cachedData) {
        setAllSubcontractorsData(cachedData);
        // Still prefetch next page in background
        const nextPage = allSubcontractorsPagination.currentPage + 1;
        prefetchPage(nextPage, allSubcontractorsPagination.pageSize, debouncedAllSubcontractorsSearch);
        return;
      }
    }
    
    setIsLoadingAll(true);
    try {
      const params = new URLSearchParams({
        companyId,
        page: allSubcontractorsPagination.currentPage.toString(),
        pageSize: allSubcontractorsPagination.pageSize.toString()
      });

      if (debouncedAllSubcontractorsSearch.trim()) {
        params.append('search', debouncedAllSubcontractorsSearch);
      }

      const response = await fetch(`/api/admin/project-snapshot/all-subcontractors?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch all subcontractors data');
      }
      
      const result = await response.json();
      setAllSubcontractorsData(result);
      
      // Cache this result
      setPrefetchedPages(prev => new Map(prev).set(cacheKey, result));
      
      // Prefetch next page in background
      const nextPage = allSubcontractorsPagination.currentPage + 1;
      if (result.pagination && nextPage <= result.pagination.totalPages) {
        prefetchPage(nextPage, allSubcontractorsPagination.pageSize, debouncedAllSubcontractorsSearch);
      }
    } catch (error) {
      console.error('Error fetching all subcontractors data:', error);
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchSubcontractorHours();
  }, [companyId, projectFilter, subcontractorFilter]);

  // Clear cache when search changes
  useEffect(() => {
    setPrefetchedPages(new Map());
  }, [debouncedAllSubcontractorsSearch, companyId]);

  // Fetch all subcontractors data when pagination, search, or project filter changes
  useEffect(() => {
    fetchAllSubcontractors();
  }, [companyId, allSubcontractorsPagination.currentPage, allSubcontractorsPagination.pageSize, debouncedAllSubcontractorsSearch, projectFilter, subcontractorFilter]);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!data || !searchQuery.trim()) return data?.subcontractorHours || [];
    
    return data.subcontractorHours.filter(item =>
      item.subcontractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.foreman.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // Prepare pie chart data - only subcontractors with hours > 0
  const pieChartData = useMemo(() => {
    if (!data) return [];
    
    return data.subcontractorHours
      .filter(item => item.totalHours > 0)
      .map(item => ({
        name: item.subcontractor.length > 15 ? item.subcontractor.substring(0, 15) + '...' : item.subcontractor,
        fullName: item.subcontractor,
        value: item.totalHours,
        hours: item.totalHours,
        employees: item.uniqueEmployees
      }));
  }, [data]);

  // No client-side filtering needed for server-side pagination
  const allSubcontractorsTableData = allSubcontractorsData?.allSubcontractors || [];

  // Pagination handlers for all subcontractors table
  const handleAllSubcontractorsPageChange = (page: number) => {
    setAllSubcontractorsPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleAllSubcontractorsPageSizeChange = (pageSize: number) => {
    setAllSubcontractorsPagination({ currentPage: 1, pageSize });
  };

  // Use server-provided pagination info
  const allSubcontractorsPaginationInfo = allSubcontractorsData?.pagination || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  };

  // Table columns - only the 3 requested columns
  const columns: ColumnDef<SubcontractorHoursData>[] = useMemo(() => [
    {
      accessorKey: "subcontractor",
      header: "Subcontractor",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("subcontractor")}</div>
      ),
    },
    {
      accessorKey: "foreman",
      header: "Foreman",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("foreman") || 'N/A'}</div>
      ),
    },
    {
      accessorKey: "totalHours",
      header: "Time Spent",
      cell: ({ row }) => (
        <div className="text-center font-semibold">
          {(row.getValue("totalHours") as number).toFixed(1)} hrs
        </div>
      ),
    },
  ], []);

  // All subcontractors table columns
  const allSubcontractorsColumns: ColumnDef<AllSubcontractorsData>[] = useMemo(() => [
    {
      accessorKey: "subcontractor",
      header: "Subcontractor",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("subcontractor")}</div>
      ),
    },
    {
      accessorKey: "foreman",
      header: "Foreman",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("foreman") || 'N/A'}</div>
      ),
    },
    {
      accessorKey: "totalHours",
      header: "Time Spent",
      cell: ({ row }) => (
        <div className="text-center font-semibold">
          {(row.getValue("totalHours") as number).toFixed(1)} hrs
        </div>
      ),
    },
    {
      accessorKey: "totalCost",
      header: "Cost",
      cell: ({ row }) => (
        <div className="text-center font-semibold text-green-600">
          ${(row.getValue("totalCost") as number).toFixed(2)}
        </div>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.subcontractorHours.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Hours by Subcontractor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No subcontractor hours data available for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Hours Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Hours by Subcontractor Table */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Hours Worked by Subcontractor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px]">
              <AdminDataTable
                data={filteredData}
                columns={columns}
                isLoading={isLoading}
                isFetching={false}
                getRowId={(item) => item.subcontractor}
                exportFilename="subcontractor_hours"
                exportHeaders={["Subcontractor", "Foreman", "Time Spent"]}
                getExportData={(item) => [
                  item.subcontractor,
                  item.foreman || 'N/A',
                  `${item.totalHours.toFixed(1)} hrs`
                ]}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                serverSide={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Hours per Subcontractor Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Hours per Subcontractor</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="aspect-square flex items-center justify-center">
                <Skeleton className="aspect-square w-full" />
              </div>
            ) : pieChartData.length === 0 ? (
              <div className="aspect-square flex items-center justify-center text-gray-500">
                No subcontractor data
              </div>
            ) : (
              <div className="aspect-square w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 60, bottom: 60, left: 60 }}>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="45%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(1)} hours`, 
                        props.payload.fullName || name
                      ]}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
                      iconSize={8}
                      formatter={(value, entry: any) => {
                        const payload = entry.payload;
                        return (
                          <span style={{ color: entry.color }}>
                            {payload?.fullName || payload?.name}: {payload?.hours?.toFixed(1)}h
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Subcontractors Table - Respects project filter when provided */}
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>
              {projectFilter ? `${projectFilter} - Subcontractors Overview` : 'All Subcontractors Overview'}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {projectFilter 
                ? `Overview of subcontractors working on ${projectFilter}` 
                : 'Complete overview of all subcontractors with their costs (independent of filters)'
              }
            </p>
          </CardHeader>
          <CardContent>
            <AdminDataTable
              data={allSubcontractorsTableData}
              columns={allSubcontractorsColumns}
              isLoading={isLoadingAll}
              isFetching={isLoadingAll}
              getRowId={(item) => item.subcontractor}
              exportFilename="all_subcontractors_overview"
              exportHeaders={["Subcontractor", "Foreman", "Time Spent", "Cost"]}
              getExportData={(item) => [
                item.subcontractor,
                item.foreman || 'N/A',
                `${item.totalHours.toFixed(1)} hrs`,
                `$${item.totalCost.toFixed(2)}`
              ]}
              searchValue={allSubcontractorsSearch}
              onSearchChange={setAllSubcontractorsSearch}
              serverSide={true}
              pagination={allSubcontractorsPaginationInfo}
              onPageChange={handleAllSubcontractorsPageChange}
              onPageSizeChange={handleAllSubcontractorsPageSizeChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}