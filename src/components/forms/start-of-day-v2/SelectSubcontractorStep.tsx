"use client";

import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { useGetSubcontractorsQuery } from '@/lib/features/subcontractors/subcontractorsApi';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface StartOfDayV2FormData {
  subcontractorName: string;
  [key: string]: any;
}

interface SelectSubcontractorStepProps {
  data: StartOfDayV2FormData;
  updateData: (updates: Partial<StartOfDayV2FormData>) => void;
  authType?: 'contractor' | 'admin';
}

export default function SelectSubcontractorStep({ data, updateData, authType = 'contractor' }: SelectSubcontractorStepProps) {
  const { t } = useTranslation('common');
  
  const { data: subcontractorsData, isLoading } = useGetSubcontractorsQuery({
    page: 1,
    pageSize: 1000,
    authType
  });

  const subcontractorOptions = subcontractorsData?.subcontractors.map(subcontractor => ({
    value: subcontractor.name,
    label: subcontractor.name
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Select Subcontractor
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please Select a Subcontractor
        </p>
      </div>

      <div className="max-w-md">
        <div className="space-y-2">
          <Label>Subcontractor *</Label>
          <SearchableSelect
            options={subcontractorOptions}
            value={data.subcontractorName}
            onValueChange={(value) => updateData({ subcontractorName: value })}
            placeholder="Select or search subcontractor..."
            searchPlaceholder="Search subcontractors..."
            emptyText={isLoading ? "Loading..." : "No subcontractors found"}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}