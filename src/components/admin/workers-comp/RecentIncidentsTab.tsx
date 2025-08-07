"use client";

import { useState, useCallback } from "react";
import { useGetIncidentsQuery } from "@/lib/features/incidents/incidentsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown,
  X,
  User,
} from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

export default function RecentIncidentsTab() {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    project: '',
    employee: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 6
  });

  // Fetch dropdown data
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });

  // Only get incidents from the last 30 days for "Recent Incidents"
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultDateFrom = filters.dateFrom || thirtyDaysAgo.toISOString().split('T')[0];

  const { data: incidentsData, isLoading } = useGetIncidentsQuery({
    page: pagination.page,
    pageSize: pagination.pageSize,
    dateFrom: defaultDateFrom,
    dateTo: filters.dateTo || undefined,
    search: [filters.project, filters.employee].filter(Boolean).join(' ') || undefined,
    authType: 'admin'
  }, {
    refetchOnMountOrArgChange: true
  });

  const incidents = incidentsData?.incidents || [];
  const paginationInfo = incidentsData?.pagination;

  const clearFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      project: '',
      employee: ''
    });
    setPagination({ page: 1, pageSize: 6 });
  }, []);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.project || filters.employee;

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleViewDetails = useCallback((incident: Incident) => {
    // TODO: Implement view details functionality
    console.log('View details for incident:', incident);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">From</div>
          <DateInput 
            value={filters.dateFrom}
            onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
            placeholder="Select date"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">To</div>
          <DateInput 
            value={filters.dateTo}
            onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
            placeholder="Select date"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Project Name</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-40 justify-between text-xs">
                {filters.project || "Select project"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-48 overflow-y-auto">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, project: '' }))}>
                All Projects
              </DropdownMenuItem>
              {projectsData?.projects?.map((project) => (
                <DropdownMenuItem 
                  key={project.id}
                  onClick={() => setFilters(prev => ({ ...prev, project: project.name }))}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Employee</div>
          <Input
            placeholder="Enter employee name"
            value={filters.employee}
            onChange={(e) => setFilters(prev => ({ ...prev, employee: e.target.value }))}
            className="w-40 text-xs"
          />
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
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent incidents found
          </div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Reported By</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">{incident.reportedBy}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Injured Employee</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">{incident.injuredEmployee}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Project Name</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">{incident.projectName}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Date Reported</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(incident.dateReported).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(incident)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {paginationInfo && paginationInfo.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!paginationInfo.hasPreviousPage}
          >
            Previous
          </Button>
          
          {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === pagination.page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNum)}
              className={pageNum === pagination.page ? "bg-blue-600 text-white" : ""}
            >
              {pageNum}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!paginationInfo.hasNextPage}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}