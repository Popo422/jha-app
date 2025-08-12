'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface NearMissDescriptionStepProps {
  data: {
    taskBeingPerformed: string;
    whatAlmostHappened: string;
    potentialConsequences: string;
    anyoneNotEmployed: string;
    pleaseExplainHow: string;
    wasAnyoneAlmostInjured: string;
    wereSafetyProceduresViolated: string;
  };
  updateData: (updates: Partial<{
    taskBeingPerformed: string;
    whatAlmostHappened: string;
    potentialConsequences: string;
    anyoneNotEmployed: string;
    pleaseExplainHow: string;
    wasAnyoneAlmostInjured: string;
    wereSafetyProceduresViolated: string;
  }>) => void;
}

export default function NearMissDescriptionStep({ data, updateData }: NearMissDescriptionStepProps) {
  const { t } = useTranslation('common');

  const handleInputChange = (field: string, value: string) => {
    updateData({ [field]: value } as any);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="taskBeingPerformed" className="text-base font-semibold">
          Task being performed:
        </Label>
        <Textarea
          id="taskBeingPerformed"
          value={data.taskBeingPerformed}
          onChange={(e) => handleInputChange('taskBeingPerformed', e.target.value)}
          placeholder="Describe the task that was being performed when the near miss occurred (optional)..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatAlmostHappened" className="text-base font-semibold">
          What almost happened?
        </Label>
        <Textarea
          id="whatAlmostHappened"
          value={data.whatAlmostHappened}
          onChange={(e) => handleInputChange('whatAlmostHappened', e.target.value)}
          placeholder="Describe what almost happened in detail..."
          className="min-h-[100px]"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="potentialConsequences" className="text-base font-semibold">
          Potential consequences:
        </Label>
        <Textarea
          id="potentialConsequences"
          value={data.potentialConsequences}
          onChange={(e) => handleInputChange('potentialConsequences', e.target.value)}
          placeholder="Describe what could have happened if the incident had occurred (optional)..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">
          Was anyone not employed by the company listed above involved in the incident?
        </Label>
        <RadioGroup
          value={data.anyoneNotEmployed}
          onValueChange={(value) => handleInputChange('anyoneNotEmployed', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="not-employed-yes" />
            <Label htmlFor="not-employed-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="not-employed-no" />
            <Label htmlFor="not-employed-no">No</Label>
          </div>
        </RadioGroup>

        {data.anyoneNotEmployed === 'yes' && (
          <div className="space-y-2 pl-6">
            <Label htmlFor="pleaseExplainHow" className="text-base font-semibold">
              Please explain how:
            </Label>
            <Textarea
              id="pleaseExplainHow"
              value={data.pleaseExplainHow}
              onChange={(e) => handleInputChange('pleaseExplainHow', e.target.value)}
              placeholder="Explain how someone not employed by the company was involved..."
              className="min-h-[80px]"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            Was anyone almost injured?
          </Label>
          <RadioGroup
            value={data.wasAnyoneAlmostInjured}
            onValueChange={(value) => handleInputChange('wasAnyoneAlmostInjured', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="almost-injured-yes" />
              <Label htmlFor="almost-injured-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="almost-injured-no" />
              <Label htmlFor="almost-injured-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">
            Were safety procedures violated?
          </Label>
          <RadioGroup
            value={data.wereSafetyProceduresViolated}
            onValueChange={(value) => handleInputChange('wereSafetyProceduresViolated', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="procedures-violated-yes" />
              <Label htmlFor="procedures-violated-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="procedures-violated-no" />
              <Label htmlFor="procedures-violated-no">No</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}