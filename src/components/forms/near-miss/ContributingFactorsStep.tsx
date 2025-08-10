'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ContributingFactorsStepProps {
  data: {
    equipmentMaterialsInvolved: string;
    unsafeBehaviorCondition: string;
    weatherEnvironmentIssues: string;
    wasPPEBeingWorn: string;
  };
  updateData: (updates: Partial<{
    equipmentMaterialsInvolved: string;
    unsafeBehaviorCondition: string;
    weatherEnvironmentIssues: string;
    wasPPEBeingWorn: string;
  }>) => void;
}

export default function ContributingFactorsStep({ data, updateData }: ContributingFactorsStepProps) {
  const { t } = useTranslation('common');

  const handleInputChange = (field: string, value: string) => {
    updateData({ [field]: value } as any);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="equipmentMaterialsInvolved" className="text-base font-semibold">
          Equipment / materials involved:
        </Label>
        <Textarea
          id="equipmentMaterialsInvolved"
          value={data.equipmentMaterialsInvolved}
          onChange={(e) => handleInputChange('equipmentMaterialsInvolved', e.target.value)}
          placeholder="Describe any equipment or materials that were involved in the near miss..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unsafeBehaviorCondition" className="text-base font-semibold">
          Unsafe behavior / condition:
        </Label>
        <Textarea
          id="unsafeBehaviorCondition"
          value={data.unsafeBehaviorCondition}
          onChange={(e) => handleInputChange('unsafeBehaviorCondition', e.target.value)}
          placeholder="Describe any unsafe behaviors or conditions that contributed to the near miss..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="weatherEnvironmentIssues" className="text-base font-semibold">
          Weather / environment issues:
        </Label>
        <Textarea
          id="weatherEnvironmentIssues"
          value={data.weatherEnvironmentIssues}
          onChange={(e) => handleInputChange('weatherEnvironmentIssues', e.target.value)}
          placeholder="Describe any weather or environmental factors that may have contributed..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">
          Was PPE being worn?
        </Label>
        <RadioGroup
          value={data.wasPPEBeingWorn}
          onValueChange={(value : any) => handleInputChange('wasPPEBeingWorn', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="ppe-worn-yes" />
            <Label htmlFor="ppe-worn-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="ppe-worn-no" />
            <Label htmlFor="ppe-worn-no">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
          Note:
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Contributing factors help identify the root causes of near miss incidents. 
          Please provide as much detail as possible to help prevent similar situations in the future.
        </p>
      </div>
    </div>
  );
}