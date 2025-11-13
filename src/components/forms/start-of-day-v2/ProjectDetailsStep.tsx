"use client";

import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProjectSelect from '@/components/ProjectSelect';
import SupervisorSelect from '@/components/SupervisorSelect';

interface StartOfDayV2FormData {
  projectName: string;
  date: string;
  supervisor: string;
  completedBy: string;
  subcontractorName: string;
  [key: string]: any;
}

interface ProjectDetailsStepProps {
  data: StartOfDayV2FormData;
  updateData: (updates: Partial<StartOfDayV2FormData>) => void;
  readOnly?: boolean;
}

export default function ProjectDetailsStep({ data, updateData, readOnly = false }: ProjectDetailsStepProps) {
  const { t } = useTranslation('common');

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Project Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <ProjectSelect
            label="Project Name *"
            value={data.projectName}
            onChange={(value) => updateData({ projectName: value })}
            placeholder="Select Project"
            required={true}
            authType="contractor"
            subcontractorName={data.subcontractorName}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-medium">
            Date *
          </Label>
          <Input
            type="date"
            id="date"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
            max={today}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <SupervisorSelect
            label="Supervisor *"
            value={data.supervisor}
            onChange={(value) => updateData({ supervisor: value })}
            placeholder="Select Supervisor"
            required={true}
            authType="contractor"
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="completedBy" className="text-sm font-medium">
            Completed By *
          </Label>
          <Input
            type="text"
            id="completedBy"
            value={data.completedBy}
            onChange={(e) => updateData({ completedBy: e.target.value })}
            placeholder="Enter Name"
            required
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}