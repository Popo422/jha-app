"use client";

import { useState, useMemo, useCallback } from "react";
import { useGetTimesheetsQuery, useUpdateTimesheetStatusMutation } from "@/lib/features/timesheets/timesheetsApi";
import { useGetProjectsQuery } from "@/lib/features/projects/projectsApi";
import { useGetProjectContractorsQuery } from "@/lib/features/contractor-management/contractorManagementApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { ColumnDef } from "@tanstack/react-table";

interface ProjectManhoursTableProps {
  projectId: string;
  weekStart: string;
  weekEnd: string;
}

interface TimesheetWithRate {
  id: string;
  employee: string;
  company: string;
  date: string;
  timeSpent: string;
  overtimeHours?: string;
  doubleHours?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  jobDescription: string;
  // Calculated fields
  regularHours: number;
  overtime: number;
  doubleTime: number;
  totalHours: number;
  baseRate: number;
  overtimeRate: number;
  doubleTimeRate: number;
  totalCost: number;
}

export default function ProjectManhoursTable({ projectId, weekStart, weekEnd }: ProjectManhoursTableProps) {
  const [pendingApprovals, setPendingApprovals] = useState<Set<string>>(new Set());

  // Get project details
  const { data: projectsData } = useGetProjectsQuery({ pageSize: 1000, authType: 'admin' });
  const currentProject = projectsData?.projects?.find(p => p.id === projectId);
  const projectName = currentProject?.name;

  // Get contractors assigned to this project
  const { data: contractorProjectsData } = useGetProjectContractorsQuery({ projectId });
  const projectContractorNames = useMemo(() => {
    if (!contractorProjectsData?.contractors) return [];
    return contractorProjectsData.contractors.map(c => 
      `${c.firstName} ${c.lastName}`.trim()
    );
  }, [contractorProjectsData]);

  // Get all timesheets
  const { data: timesheetsData, isLoading, isFetching, refetch } = useGetTimesheetsQuery({
    authType: 'admin',
    fetchAll: true
  });


  const [updateTimesheetStatus] = useUpdateTimesheetStatusMutation();

  // Filter and transform timesheet data with rates and calculations
  const processedTimesheets = useMemo(() => {
    if (!timesheetsData?.timesheets || !timesheetsData?.contractorRates || !projectName) return [];
    
    return timesheetsData.timesheets
      .filter(timesheet => {
        // Filter by project contractors
        const isProjectContractor = projectContractorNames.includes(timesheet.employee);
        
        // Filter by date range
        const timesheetDate = new Date(timesheet.date);
        const startDate = new Date(weekStart);
        const endDate = new Date(weekEnd);
        const inDateRange = timesheetDate >= startDate && timesheetDate <= endDate;
        
        // Filter by project name (optional - you can remove this if not needed)
        const isProjectMatch = timesheet.projectName === projectName;
        
        return isProjectContractor && inDateRange && isProjectMatch;
      })
      .map(timesheet => {
        const rates = timesheetsData.contractorRates?.[timesheet.employee] || {
          rate: '0',
          overtimeRate: null,
          doubleTimeRate: null
        };

        const baseRate = parseFloat(rates.rate || '0');
        const overtimeRate = parseFloat(rates.overtimeRate || '0') || (baseRate * 1.5);
        const doubleTimeRate = parseFloat(rates.doubleTimeRate || '0') || (baseRate * 2);

        const regularHours = parseFloat(timesheet.timeSpent || '0');
        const overtime = parseFloat(timesheet.overtimeHours || '0');
        const doubleTime = parseFloat(timesheet.doubleHours || '0');
        const totalHours = regularHours + overtime + doubleTime;

        const totalCost = (regularHours * baseRate) + (overtime * overtimeRate) + (doubleTime * doubleTimeRate);

        return {
          ...timesheet,
          regularHours,
          overtime,
          doubleTime,
          totalHours,
          baseRate,
          overtimeRate,
          doubleTimeRate,
          totalCost
        } as TimesheetWithRate;
      });
  }, [timesheetsData, projectContractorNames]);

  const handleApprove = useCallback(async (id: string) => {
    setPendingApprovals(prev => new Set(prev).add(id));
    try {
      await updateTimesheetStatus({ 
        id, 
        status: 'approved',
        authType: 'admin' 
      }).unwrap();
      refetch();
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
    } finally {
      setPendingApprovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [updateTimesheetStatus, refetch]);

  const handleReject = useCallback(async (id: string) => {
    setPendingApprovals(prev => new Set(prev).add(id));
    try {
      await updateTimesheetStatus({ 
        id, 
        status: 'rejected',
        authType: 'admin' 
      }).unwrap();
      refetch();
    } catch (error) {
      console.error('Failed to reject timesheet:', error);
    } finally {
      setPendingApprovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [updateTimesheetStatus, refetch]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>;
    }
  }, []);

  const columns = useMemo<ColumnDef<TimesheetWithRate>[]>(() => [
    {
      accessorKey: 'employee',
      header: 'Contractor',
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.getValue('employee')}</div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className="text-sm">{new Date(row.getValue('date')).toLocaleDateString()}</div>
      ),
    },
    {
      accessorKey: 'regularHours',
      header: 'Regular Hours',
      cell: ({ row }) => (
        <div className="text-sm text-center">{row.original.regularHours.toFixed(2)}</div>
      ),
    },
    {
      accessorKey: 'overtime',
      header: 'Overtime',
      cell: ({ row }) => (
        <div className="text-sm text-center">{row.original.overtime.toFixed(2)}</div>
      ),
    },
    {
      accessorKey: 'doubleTime',
      header: 'Double Time',
      cell: ({ row }) => (
        <div className="text-sm text-center">{row.original.doubleTime.toFixed(2)}</div>
      ),
    },
    {
      accessorKey: 'totalHours',
      header: 'Total Hours',
      cell: ({ row }) => (
        <div className="text-sm text-center font-medium">{row.original.totalHours.toFixed(2)}</div>
      ),
    },
    {
      accessorKey: 'totalCost',
      header: 'Total Cost',
      cell: ({ row }) => (
        <div className="text-sm text-right font-medium">${row.original.totalCost.toFixed(2)}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const timesheet = row.original;
        const isProcessing = pendingApprovals.has(timesheet.id);
        
        if (timesheet.status === 'approved' || timesheet.status === 'rejected') {
          return (
            <div className="text-xs text-gray-500 text-center">
              {timesheet.status === 'approved' ? 'Approved' : 'Rejected'}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleApprove(timesheet.id)}
              disabled={isProcessing}
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(timesheet.id)}
              disabled={isProcessing}
              className="h-8"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ], [getStatusBadge, handleApprove, handleReject, pendingApprovals]);

  // Calculate totals
  const totals = useMemo(() => {
    return processedTimesheets.reduce(
      (acc, timesheet) => ({
        regularHours: acc.regularHours + timesheet.regularHours,
        overtime: acc.overtime + timesheet.overtime,
        doubleTime: acc.doubleTime + timesheet.doubleTime,
        totalHours: acc.totalHours + timesheet.totalHours,
        totalCost: acc.totalCost + timesheet.totalCost,
      }),
      { regularHours: 0, overtime: 0, doubleTime: 0, totalHours: 0, totalCost: 0 }
    );
  }, [processedTimesheets]);

  if (!currentProject) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading project information...
      </div>
    );
  }

  if (projectContractorNames.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No contractors assigned to this project.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Manhours Table
        </h4>
        <div className="text-sm text-gray-600">
          {projectContractorNames.length} contractor{projectContractorNames.length !== 1 ? 's' : ''} assigned
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400">Regular Hours</div>
          <div className="text-lg font-semibold">{totals.regularHours.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400">Overtime</div>
          <div className="text-lg font-semibold">{totals.overtime.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400">Double Time</div>
          <div className="text-lg font-semibold">{totals.doubleTime.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Hours</div>
          <div className="text-lg font-semibold">{totals.totalHours.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Cost</div>
          <div className="text-lg font-semibold">${totals.totalCost.toFixed(2)}</div>
        </div>
      </div>

      <AdminDataTable
        data={processedTimesheets}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        getRowId={(timesheet) => timesheet.id}
        exportFilename="project_manhours"
        exportHeaders={[
          'Contractor', 'Date', 'Regular Hours', 'Overtime', 'Double Time', 
          'Total Hours', 'Total Cost', 'Status'
        ]}
        getExportData={(timesheet) => [
          timesheet.employee,
          timesheet.date,
          timesheet.regularHours.toFixed(2),
          timesheet.overtime.toFixed(2),
          timesheet.doubleTime.toFixed(2),
          timesheet.totalHours.toFixed(2),
          timesheet.totalCost.toFixed(2),
          timesheet.status
        ]}
      />
    </div>
  );
}