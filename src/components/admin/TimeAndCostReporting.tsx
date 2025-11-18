"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import WeeklyNavigator from "./WeeklyNavigator";
import CertifiedPayrollReport from "./CertifiedPayrollReport";
import ProjectManhoursTable from "./ProjectManhoursTable";
import { useGetCertifiedPayrollQuery } from "@/lib/features/certified-payroll/certifiedPayrollApi";

interface TimeAndCostReportingProps {
  projectId: string;
}

export default function TimeAndCostReporting({ projectId }: TimeAndCostReportingProps) {
  const router = useRouter();
  
  // Get current week
  const getCurrentWeekStart = (date: Date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // First day is Sunday
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getCurrentWeekStart());

  const weekRange = useMemo(() => {
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(startDate.getDate() + 6);

    const formatDateForAPI = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    return {
      startDate,
      endDate,
      weekStart: formatDateForAPI(startDate),
      weekEnd: formatDateForAPI(endDate)
    };
  }, [currentWeekStart]);

  // Fetch certified payroll data
  const { data: payrollData, isLoading, error } = useGetCertifiedPayrollQuery({
    projectId,
    weekStart: weekRange.weekStart,
    weekEnd: weekRange.weekEnd,
  });

  const handleWeekChange = (startDate: Date, endDate: Date) => {
    setCurrentWeekStart(startDate);
  };

  const handleStartCertifiedPayroll = () => {
    router.push(`/admin/certified-payroll/${projectId}/create`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">Time and Cost Reporting</h3>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleStartCertifiedPayroll}
        >
          Start Certified Payroll
        </Button>
      </div>
      
      <WeeklyNavigator onWeekChange={handleWeekChange} />
      
      <ProjectManhoursTable 
        projectId={projectId}
        weekStart={weekRange.weekStart}
        weekEnd={weekRange.weekEnd}
      />
      
      <CertifiedPayrollReport 
        data={payrollData || null}
        isLoading={isLoading}
      />
    </div>
  );
}