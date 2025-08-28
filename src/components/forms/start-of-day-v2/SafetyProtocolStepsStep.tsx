"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface StartOfDayV2FormData {
  listTheSteps: string[];
  identifyHazards: string[];
  protectionMethods: string[];
  [key: string]: any;
}

interface SafetyProtocolStepsStepProps {
  data: StartOfDayV2FormData;
  updateData: (updates: Partial<StartOfDayV2FormData>) => void;
  onSubmit?: () => void;
}

interface StepSectionProps {
  title: string;
  steps: string[];
  onUpdateSteps: (steps: string[]) => void;
  placeholder?: string;
}

function StepSection({ title, steps, onUpdateSteps, placeholder = "Enter Step" }: StepSectionProps) {
  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    onUpdateSteps(newSteps);
  };

  const addStep = () => {
    onUpdateSteps([...steps, '']);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onUpdateSteps(newSteps);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                  {index + 1}
                </span>
              </div>
              <Input
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeStep(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addStep}
          className="w-full flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SafetyProtocolStepsStep({ 
  data, 
  updateData, 
  onSubmit 
}: SafetyProtocolStepsStepProps) {
  const { t } = useTranslation('common');

  const sections = [
    {
      key: 'listTheSteps' as const,
      title: 'Step 1 - List the Steps',
      steps: data.listTheSteps,
      placeholder: 'Enter Step'
    },
    {
      key: 'identifyHazards' as const,
      title: 'Step 2 - Identify the Safety Hazards',
      steps: data.identifyHazards,
      placeholder: 'Enter Step'
    },
    {
      key: 'protectionMethods' as const,
      title: 'Step 3 - Methods to Protect Our People',
      steps: data.protectionMethods,
      placeholder: 'Enter Step'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Safety Protocol Steps
        </h2>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <StepSection
            key={section.key}
            title={section.title}
            steps={section.steps}
            onUpdateSteps={(steps) => updateData({ [section.key]: steps })}
            placeholder={section.placeholder}
          />
        ))}
      </div>


      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
          Before Submitting
        </h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Please review all steps in your safety protocol. Make sure you have identified all relevant 
          safety hazards and outlined proper methods to protect your team.
        </p>
      </div>
    </div>
  );
}