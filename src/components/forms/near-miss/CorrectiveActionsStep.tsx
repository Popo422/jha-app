'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CorrectiveActionsStepProps {
  data: {
    actionsTaken: string;
    preventionRecommendations: string;
  };
  updateData: (updates: Partial<{
    actionsTaken: string;
    preventionRecommendations: string;
  }>) => void;
  readOnly?: boolean;
}

export default function CorrectiveActionsStep({ data, updateData, readOnly = false }: CorrectiveActionsStepProps) {
  const { t } = useTranslation('common');

  const handleInputChange = (field: string, value: string) => {
    updateData({ [field]: value } as any);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="actionsTaken" className="text-base font-semibold">
          Actions taken:
        </Label>
        <Textarea
          id="actionsTaken"
          value={data.actionsTaken}
          onChange={(e) => handleInputChange('actionsTaken', e.target.value)}
          placeholder="Describe the actions that were taken immediately following the near miss incident (optional)..."
          className="min-h-[120px]"
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preventionRecommendations" className="text-base font-semibold">
          Prevention recommendations:
        </Label>
        <Textarea
          id="preventionRecommendations"
          value={data.preventionRecommendations}
          onChange={(e) => handleInputChange('preventionRecommendations', e.target.value)}
          placeholder="Provide recommendations for preventing similar near miss incidents in the future (optional)..."
          className="min-h-[120px]"
          readOnly={readOnly}
        />
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Important Guidelines:
        </h3>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• Actions should address immediate safety concerns</li>
          <li>• Prevention recommendations should target root causes</li>
          <li>• Consider training, procedural changes, and equipment improvements</li>
          <li>• Be specific and actionable in your recommendations</li>
        </ul>
      </div>
    </div>
  );
}