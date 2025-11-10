"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Calendar } from 'lucide-react';

interface TimeFrameSelectionStepProps {
  selectedContractors: string[];
  initialDateRange?: { startDate: string; endDate: string } | null;
  onNext: (startDate: string, endDate: string) => void;
  onBack: () => void;
}

export default function TimeFrameSelectionStep({ 
  selectedContractors, 
  initialDateRange,
  onNext,
  onBack 
}: TimeFrameSelectionStepProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get current week starting at Sunday
  const getCurrentWeekStart = (date: Date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // First day is Sunday
    return new Date(d.setDate(diff));
  };

  // Initialize with provided date range or current week
  useEffect(() => {
    if (initialDateRange && initialDateRange.startDate && initialDateRange.endDate) {
      // Use the provided date range from wizard state
      setStartDate(initialDateRange.startDate);
      setEndDate(initialDateRange.endDate);
    } else {
      // Default to current week if no initial dates provided
      const weekStart = getCurrentWeekStart();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      setStartDate(weekStart.toISOString().split('T')[0]);
      setEndDate(weekEnd.toISOString().split('T')[0]);
    }
  }, [initialDateRange]);

  // Validation functions
  const validateDateRange = (start: string, end: string): string[] => {
    const errors: string[] = [];
    
    if (!start || !end) {
      errors.push('Both start and end dates are required');
      return errors;
    }

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today for comparison

    // Check for invalid dates
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      errors.push('Invalid date format');
      return errors;
    }

    // Check for future dates
    if (startDateObj > today) {
      errors.push('Start date cannot be in the future');
    }
    if (endDateObj > today) {
      errors.push('End date cannot be in the future');
    }

    // Check date order
    if (endDateObj < startDateObj) {
      errors.push('End date must be on or after start date');
    }

    // Check for reasonable date range (not more than 1 year)
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      errors.push('Date range cannot exceed 365 days');
    }

    return errors;
  };

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    
    // Auto-calculate end date (6 days after start date) only if no end date is set
    if (!endDate || endDate === '') {
      const start = new Date(newStartDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      // Ensure end date doesn't exceed today
      const today = new Date();
      if (end > today) {
        setEndDate(today.toISOString().split('T')[0]);
      } else {
        setEndDate(end.toISOString().split('T')[0]);
      }
    }
    
    // Validate the new range
    const errors = validateDateRange(newStartDate, endDate);
    setValidationErrors(errors);
  };

  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
    
    // Validate the new range
    const errors = validateDateRange(startDate, newEndDate);
    setValidationErrors(errors);
  };

  const handleNext = () => {
    const errors = validateDateRange(startDate, endDate);
    setValidationErrors(errors);
    
    if (errors.length === 0 && startDate && endDate) {
      onNext(startDate, endDate);
    }
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  const selectCurrentWeek = () => {
    const weekStart = getCurrentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startDateStr = weekStart.toISOString().split('T')[0];
    const endDateStr = weekEnd.toISOString().split('T')[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    
    // Validate the selected range
    const errors = validateDateRange(startDateStr, endDateStr);
    setValidationErrors(errors);
  };

  const selectPreviousWeek = () => {
    const weekStart = getCurrentWeekStart();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startDateStr = weekStart.toISOString().split('T')[0];
    const endDateStr = weekEnd.toISOString().split('T')[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    
    // Validate the selected range
    const errors = validateDateRange(startDateStr, endDateStr);
    setValidationErrors(errors);
  };

  // Check if current week would be in the future
  const isCurrentWeekInFuture = () => {
    const currentWeekStart = getCurrentWeekStart();
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStartDateOnly = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate());
    
    return weekStartDateOnly > todayDateOnly;
  };

  // Get max date (today)
  const getMaxDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Select Time Frame</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the time period for this certified payroll report. Selected {selectedContractors.length} contractors.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
        <div className="space-y-8">
          {/* Quick selection buttons */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Quick Selection</h4>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={selectCurrentWeek}
                disabled={isCurrentWeekInFuture()}
                className="text-sm"
              >
                Current Week
              </Button>
              <Button
                variant="outline"
                onClick={selectPreviousWeek}
                className="text-sm"
              >
                Previous Week
              </Button>
            </div>
            {isCurrentWeekInFuture() && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Current week is in the future. Only past and current periods can be selected.
              </p>
            )}
          </div>

          {/* Custom date selection */}
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Custom Range</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="start-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date (Sunday)
                </label>
                <DateInput
                  id="start-date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  max={getMaxDate()}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="end-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date (Saturday)
                </label>
                <DateInput
                  id="end-date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  min={startDate || undefined}
                  max={getMaxDate()}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="space-y-2">
                <p className="font-medium text-red-900 dark:text-red-100">
                  Please correct the following errors:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-red-700 dark:text-red-300 text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Selected range display */}
          {startDate && endDate && validationErrors.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Selected Period
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {formatDateRange()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!startDate || !endDate || validationErrors.length > 0}
          className="bg-black hover:bg-gray-800 text-white"
        >
          Next
        </Button>
      </div>
    </div>
  );
}