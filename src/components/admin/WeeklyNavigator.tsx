"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeeklyNavigatorProps {
  onWeekChange?: (startDate: Date, endDate: Date) => void;
}

export default function WeeklyNavigator({ onWeekChange }: WeeklyNavigatorProps) {
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

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    };

    return {
      startDate,
      endDate,
      formatted: `${formatDate(startDate)} - ${formatDate(endDate)}`
    };
  }, [currentWeekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
    
    const endDate = new Date(newWeekStart);
    endDate.setDate(newWeekStart.getDate() + 6);
    
    onWeekChange?.(newWeekStart, endDate);
  };

  return (
    <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateWeek('prev')}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[200px] text-center">
          {weekRange.formatted}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateWeek('next')}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
  );
}