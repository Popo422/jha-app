"use client";

import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useGetSubcontractorsQuery } from '@/lib/features/subcontractors/subcontractorsApi';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface EndOfDayV2FormData {
  subcontractorName: string;
  date: string;
  [key: string]: any;
}

interface SelectSubcontractorStepProps {
  data: EndOfDayV2FormData;
  updateData: (updates: Partial<EndOfDayV2FormData>) => void;
  authType?: 'contractor' | 'admin';
  readOnly?: boolean;
}

export default function SelectSubcontractorStep({ data, updateData, authType = 'contractor', readOnly = false }: SelectSubcontractorStepProps) {
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

      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label>Subcontractor *</Label>
          <SearchableSelect
            options={subcontractorOptions}
            value={data.subcontractorName}
            onValueChange={(value) => updateData({ subcontractorName: value })}
            placeholder="Select Subcontractor"
            searchPlaceholder="Search subcontractors..."
            emptyText={isLoading ? "Loading..." : "No subcontractors found"}
            disabled={isLoading || readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label>Select a Date *</Label>
          <Input
            type="date"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
            required
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}