"use client";

import React, { useState } from "react";
import { useGetWorkmenWeeklyDataQuery, type WorkmenWeeklyData } from "@/lib/features/timesheets/timesheetsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Users, Clock, DollarSign, ChevronDown } from "lucide-react";
import type { ColumnDef, Row } from "@tanstack/react-table";

interface WorkmenWeeklyAnalyticsProps {
  projectId: string;
}

export default function WorkmenWeeklyAnalytics({ projectId }: WorkmenWeeklyAnalyticsProps) {
  const [hourType, setHourType] = useState<'regular' | 'overtime' | 'double'>('regular');
  const { data, isLoading, error } = useGetWorkmenWeeklyDataQuery({ projectId, hourType });
  const [search, setSearch] = useState("");

  const hourTypeLabels = {
    regular: 'Regular Hours',
    overtime: 'Overtime Hours', 
    double: 'Double Hours'
  };

  // Define table columns
  const columns: ColumnDef<WorkmenWeeklyData>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }: { row: Row<WorkmenWeeklyData> }) => (
        <div className="font-medium">{row.getValue("employeeName")}</div>
      ),
    },
    ...(data?.weekDates || []).map((date, index) => ({
      id: `day_${index}`,
      header: () => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dateObj = new Date(date);
        const dayName = dayNames[dateObj.getDay()];
        const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        return (
          <div className="text-center">
            <div className="text-xs text-gray-500">{dayName}</div>
            <div className="text-xs">{monthDay}</div>
          </div>
        );
      },
      cell: ({ row }: { row: Row<WorkmenWeeklyData> }) => {
        const workman = row.original;
        const hours = workman.weeklyHours[date] || 0;
        return (
          <div className="text-center">
            {hours > 0 ? (
              <span className="font-medium">{hours.toFixed(1)}h</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
      size: 80,
    })),
    {
      accessorKey: "totalHours",
      header: () => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Total</span>
          </div>
        </div>
      ),
      cell: ({ row }: { row: Row<WorkmenWeeklyData> }) => (
        <div className="text-center font-medium">
          {row.getValue<number>("totalHours").toFixed(1)}h
        </div>
      ),
    },
    {
      accessorKey: "billingRate",
      header: () => (
        <div className="text-center">Rate</div>
      ),
      cell: ({ row }: { row: Row<WorkmenWeeklyData> }) => (
        <div className="text-center">
          ${parseFloat(row.getValue<string>("billingRate")).toFixed(2)}/h
        </div>
      ),
    },
    {
      accessorKey: "grossPay",
      header: () => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>Gross</span>
          </div>
        </div>
      ),
      cell: ({ row }: { row: Row<WorkmenWeeklyData> }) => (
        <div className="text-center font-medium text-green-600">
          ${row.getValue<number>("grossPay").toFixed(2)}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Workmen Weekly Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Workmen Weekly Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">
            Failed to load workmen data
          </div>
        </CardContent>
      </Card>
    );
  }

  const allWorkmenData = data?.data || [];
  
  // Filter workmen data based on search
  const workmenData = allWorkmenData.filter(workman => 
    workman.employeeName.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalWorkmen = workmenData.length;
  const totalHours = workmenData.reduce((sum, w) => sum + w.totalHours, 0);
  const totalGross = workmenData.reduce((sum, w) => sum + w.grossPay, 0);

  if (allWorkmenData.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No workmen data
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          No workmen are assigned to this project or no timesheet data available for this week.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hour Type Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-40 justify-between">
                {hourTypeLabels[hourType]}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setHourType('regular')}>
                Regular Hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHourType('overtime')}>
                Overtime Hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHourType('double')}>
                Double Hours
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
      </div>
      
      {/* Data Table */}
      <AdminDataTable
        data={workmenData}
        columns={columns}
        isLoading={isLoading}
        isFetching={isLoading}
        getRowId={(workman) => workman.contractorId}
        exportFilename={`workmen-${hourType}-hours`}
        exportHeaders={[
          "Employee", 
          ...data?.weekDates?.map(date => new Date(date).toLocaleDateString()) || [],
          "Total Hours", 
          "Billing Rate", 
          "Gross Pay"
        ]}
        getExportData={(workman) => [
          workman.employeeName,
          ...data?.weekDates?.map(date => workman.weeklyHours[date]?.toFixed(1) || '0') || [],
          workman.totalHours.toFixed(1),
          `$${parseFloat(workman.billingRate).toFixed(2)}`,
          `$${workman.grossPay.toFixed(2)}`
        ]}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}