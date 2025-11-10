"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetProjectContractorsQuery } from '@/lib/features/certified-payroll/certifiedPayrollApi';
import { Plus, User } from 'lucide-react';

interface PayrollDetailsStepProps {
  projectId: string;
  selectedContractors: string[];
  selectedDateRange: { startDate: string; endDate: string } | null;
  onNext: () => void;
  onBack: () => void;
  onAddPayrollData: (contractorId: string) => void;
  onGenerateReport?: () => void;
}

export default function PayrollDetailsStep({ 
  projectId, 
  selectedContractors,
  selectedDateRange,
  onNext,
  onBack,
  onAddPayrollData,
  onGenerateReport
}: PayrollDetailsStepProps) {
  const { data: contractorsData } = useGetProjectContractorsQuery(projectId);

  // Filter contractors to only show selected ones
  const selectedContractorData = contractorsData?.contractors.filter(
    contractor => selectedContractors.includes(contractor.id)
  ) || [];

  const formatDateRange = () => {
    if (!selectedDateRange) return 'No date range selected';
    
    const start = new Date(selectedDateRange.startDate);
    const end = new Date(selectedDateRange.endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Add Payroll Details</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add payroll information for the selected workmen during the period: {formatDateRange()}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Selected Workmen ({selectedContractorData.length})
            </h4>
          </div>

          {selectedContractorData.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No contractors selected
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                      Employee Name
                    </th>
                    <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                      Role
                    </th>
                    <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                      Email
                    </th>
                    <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedContractorData.map((contractor) => (
                    <tr
                      key={contractor.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {contractor.name}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {contractor.role}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">
                        {contractor.email}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          onClick={() => onAddPayrollData(contractor.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Payroll Data
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onGenerateReport || onNext}
          className="bg-black hover:bg-gray-800 text-white"
        >
          Generate Report
        </Button>
      </div>
    </div>
  );
}