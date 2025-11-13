"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import WorkmenSelectionTable from './WorkmenSelectionTable';
import { useGetProjectContractorsQuery } from '@/lib/features/certified-payroll/certifiedPayrollApi';

interface WorkmenSelectionStepProps {
  projectId: string;
  onNext: (selectedContractors: string[]) => void;
  onBack: () => void;
}

export default function WorkmenSelectionStep({ 
  projectId, 
  onNext,
  onBack 
}: WorkmenSelectionStepProps) {
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { data: contractorsData } = useGetProjectContractorsQuery(projectId);

  // Auto-select all contractors when data loads (only once)
  useEffect(() => {
    if (contractorsData?.contractors && !hasInitialized) {
      setSelectedContractors(contractorsData.contractors.map(c => c.id));
      setHasInitialized(true);
    }
  }, [contractorsData, hasInitialized]);

  const handleNext = () => {
    onNext(selectedContractors);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-8">
        <WorkmenSelectionTable
          projectId={projectId}
          selectedContractors={selectedContractors}
          onSelectionChange={setSelectedContractors}
          onNext={handleNext}
          onBack={onBack}
        />
      </CardContent>
    </Card>
  );
}