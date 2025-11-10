"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProjectContractorsQuery, ProjectContractor } from '@/lib/features/certified-payroll/certifiedPayrollApi';

interface WorkmenSelectionTableProps {
  projectId: string;
  selectedContractors: string[];
  onSelectionChange: (contractorIds: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function WorkmenSelectionTable({ 
  projectId, 
  selectedContractors, 
  onSelectionChange,
  onNext,
  onBack 
}: WorkmenSelectionTableProps) {
  const { data, isLoading, error } = useGetProjectContractorsQuery(projectId);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Check all
      if (data?.contractors) {
        onSelectionChange(data.contractors.map(c => c.id));
      }
    } else {
      // Uncheck all
      onSelectionChange([]);
    }
  };

  const handleSelectContractor = (contractorId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedContractors, contractorId]);
    } else {
      onSelectionChange(selectedContractors.filter(id => id !== contractorId));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2) + ' hrs';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">
          Failed to load contractors. Please try again.
        </p>
      </div>
    );
  }

  if (!data?.contractors || data.contractors.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center space-y-6">
        <div className="space-y-4">
          <h4 className="text-xl font-medium text-gray-600 dark:text-gray-300">
            No Contractors Found
          </h4>
          <p className="text-gray-500 dark:text-gray-400">
            No contractors are assigned to this project yet.
          </p>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled>
            Next
          </Button>
        </div>
      </div>
    );
  }

  const totalContractors = data?.contractors?.length || 0;
  const selectedCount = selectedContractors.length;
  
  const allSelected = totalContractors > 0 && selectedCount === totalContractors;
  const someSelected = selectedCount > 0 && selectedCount < totalContractors;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Workmen</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the contractors to include in the certified payroll report.
          </p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedContractors.length} of {data.contractors.length} selected
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    ref={(ref) => {
                      if (ref) {
                        (ref as any).indeterminate = someSelected;
                      }
                    }}
                  />
                </th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                  Employee Name
                </th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                  Total Project Hours
                </th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                  Gross Earned
                </th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                  Date of Hire
                </th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {data.contractors.map((contractor) => (
                <tr
                  key={contractor.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedContractors.includes(contractor.id)}
                      onCheckedChange={(checked) => 
                        handleSelectContractor(contractor.id, checked as boolean)
                      }
                    />
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {contractor.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {contractor.email}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-900 dark:text-gray-100">
                    {formatHours(contractor.totalProjectHours)}
                  </td>
                  <td className="p-4 text-gray-900 dark:text-gray-100">
                    {formatCurrency(contractor.grossEarned)}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400">
                    {formatDate(contractor.dateOfHire)}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {contractor.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={selectedContractors.length === 0}
          className="bg-black hover:bg-gray-800 text-white"
        >
          Next ({selectedContractors.length} selected)
        </Button>
      </div>
    </div>
  );
}