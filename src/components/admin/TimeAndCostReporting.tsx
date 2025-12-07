"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Receipt, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import WeeklyNavigator from "./WeeklyNavigator";
import ProjectManhoursTable from "./ProjectManhoursTable";
import ProjectExpenses from "./ProjectExpenses";
import ProjectTimesheet from "./ProjectTimesheet";

interface TimeAndCostReportingProps {
  projectId: string;
}

export default function TimeAndCostReporting({ projectId }: TimeAndCostReportingProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('payroll');
  
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
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'payroll'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          Certified Payroll
        </button>
        <button
          onClick={() => setActiveTab('timesheet')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'timesheet'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Timesheet
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Expenses
        </button>
      </div>
      
      {/* Render both components but hide inactive ones */}
      <div className={`${activeTab === 'payroll' ? 'block' : 'hidden'} space-y-6`}>
        <div className="flex justify-end">
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
      </div>
      
      <div className={`${activeTab === 'timesheet' ? 'block' : 'hidden'}`}>
        <ProjectTimesheet projectId={projectId} />
      </div>
      
      <div className={`${activeTab === 'expenses' ? 'block' : 'hidden'}`}>
        <ProjectExpenses projectId={projectId} />
      </div>
    </div>
  );
}