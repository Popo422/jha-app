"use client";

import { useState, useMemo, useCallback } from "react";
import { useGetCertifiedPayrollQuery, type PayrollWorker } from "@/lib/features/certified-payroll/certifiedPayrollApi";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectManhoursTableProps {
  projectId: string;
  weekStart: string;
  weekEnd: string;
}

// Helper function to get date for each day of the week
const getDateForDay = (weekStart: string, dayOffset: number) => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};

export default function ProjectManhoursTable({ projectId, weekStart, weekEnd }: ProjectManhoursTableProps) {
  // Get certified payroll data
  const { data: payrollData, isLoading, isFetching } = useGetCertifiedPayrollQuery({
    projectId,
    weekStart,
    weekEnd
  });

  // Calculate totals
  const totals = useMemo(() => {
    if (!payrollData?.workers) {
      return {
        straightHours: 0,
        overtimeHours: 0,
        doubleHours: 0,
        totalHours: 0,
        grossAmount: 0
      };
    }

    return payrollData.workers.reduce((acc, worker) => {
      return {
        straightHours: acc.straightHours + worker.totalHours.straight,
        overtimeHours: acc.overtimeHours + worker.totalHours.overtime,
        doubleHours: acc.doubleHours + worker.totalHours.double,
        totalHours: acc.totalHours + worker.totalHours.straight + worker.totalHours.overtime + worker.totalHours.double,
        grossAmount: acc.grossAmount + worker.grossAmount
      };
    }, {
      straightHours: 0,
      overtimeHours: 0,
      doubleHours: 0,
      totalHours: 0,
      grossAmount: 0
    });
  }, [payrollData?.workers]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        
        {/* Single block skeleton for the entire table */}
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  const data = payrollData?.workers || [];

  return (
    <div className="space-y-4">

      {/* Summary totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
          <div className="text-xs text-gray-500">Straight Hours</div>
          <div className="text-lg font-semibold">{totals.straightHours.toFixed(1)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
          <div className="text-xs text-gray-500">Overtime Hours</div>
          <div className="text-lg font-semibold">{totals.overtimeHours.toFixed(1)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
          <div className="text-xs text-gray-500">Double Hours</div>
          <div className="text-lg font-semibold">{totals.doubleHours.toFixed(1)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
          <div className="text-xs text-gray-500">Total Hours</div>
          <div className="text-lg font-semibold text-blue-600">{totals.totalHours.toFixed(1)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
          <div className="text-xs text-gray-500">Gross Amount</div>
          <div className="text-lg font-semibold text-green-600">${totals.grossAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Payroll Table - matches PDF structure */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-700">
              <th className="p-3 text-left font-medium w-32 min-w-32">
                Name
              </th>
              <th className="p-3 text-center font-medium w-8"></th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 0)}<br/>
                Sun
              </th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 1)}<br/>
                Mon
              </th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 2)}<br/>
                Tue
              </th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 3)}<br/>
                Wed
              </th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 4)}<br/>
                Thu
              </th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 5)}<br/>
                Fri
              </th>
              <th className="p-3 text-center font-medium w-20">
                {getDateForDay(weekStart, 6)}<br/>
                Sat
              </th>
              <th className="p-3 text-center font-medium w-20">
                Total Hours
              </th>
              <th className="p-3 text-center font-medium w-24">
                Rates
              </th>
              <th className="p-3 text-center font-medium w-24">
                Gross Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((worker, index) => (
              <tr key={worker.id} className="border-b">
                {/* Worker Info */}
                <td className="p-3 border-r w-32 min-w-32">
                  <div className="text-xs font-medium">{worker.name}</div>
                </td>


                {/* S/O/D Label Column */}
                <td className="p-0 border-r w-8 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs font-medium">S</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs font-medium">O</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs font-medium">D</span>
                    </div>
                  </div>
                </td>

                {/* Sunday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.sunday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.sunday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.sunday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Monday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.monday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.monday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.monday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Tuesday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.tuesday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.tuesday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.tuesday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Wednesday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.wednesday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.wednesday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.wednesday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Thursday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.thursday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.thursday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.thursday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Friday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.friday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.friday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.friday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Saturday */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.saturday.straight || '0'}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.saturday.overtime || '0'}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">{worker.dailyHours.saturday.double || '0'}</span>
                    </div>
                  </div>
                </td>

                {/* Total Hours - Split into S/O/D like daily columns */}
                <td className="p-0 border-r w-20 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs font-medium">{worker.totalHours.straight.toFixed(1)}</span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs font-medium">{worker.totalHours.overtime.toFixed(1)}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs font-medium">{worker.totalHours.double.toFixed(1)}</span>
                    </div>
                  </div>
                </td>

                {/* Rates - Split into S/O/D showing actual backend rates with fallbacks */}
                <td className="p-0 border-r w-24 text-center">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">
                        {worker.baseHourlyRate ? `$${worker.baseHourlyRate.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex-1 border-b flex items-center justify-center py-1">
                      <span className="text-xs">
                        {worker.overtimeRate ? 
                          `$${worker.overtimeRate.toFixed(2)}` : 
                          worker.baseHourlyRate ? `$${(worker.baseHourlyRate * 1.5).toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-1">
                      <span className="text-xs">
                        {worker.doubleTimeRate ? 
                          `$${worker.doubleTimeRate.toFixed(2)}` : 
                          worker.baseHourlyRate ? `$${(worker.baseHourlyRate * 2).toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Gross Amount */}
                <td className="p-3 w-24 text-center">
                  <div className="text-xs font-medium text-green-600">${worker.grossAmount.toFixed(2)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}