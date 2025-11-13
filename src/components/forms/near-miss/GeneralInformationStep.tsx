'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ContractorSelect from '@/components/ContractorSelect';
import ProjectSelect from '@/components/ProjectSelect';
import SubcontractorSelect from '@/components/SubcontractorSelect';

interface GeneralInformationStepProps {
  data: {
    reportedBy: string;
    supervisor: string;
    projectName: string;
    companySubcontractor: string;
    safetyRepresentative: string;
    dateTimeOfNearMiss: string;
    dateTimeManagementNotified: string;
    whoWasNotified: string;
    witnessesContactInfo: string;
    witnessStatementsTaken: string;
    witnessStatementsAttached: string;
    typeOfIncident: string;
    causeOfIncident: string;
    causeOtherExplanation: string;
  };
  updateData: (updates: Partial<{
    reportedBy: string;
    supervisor: string;
    projectName: string;
    companySubcontractor: string;
    safetyRepresentative: string;
    dateTimeOfNearMiss: string;
    dateTimeManagementNotified: string;
    whoWasNotified: string;
    witnessesContactInfo: string;
    witnessStatementsTaken: string;
    witnessStatementsAttached: string;
    typeOfIncident: string;
    causeOfIncident: string;
    causeOtherExplanation: string;
  }>) => void;
  authType?: 'contractor' | 'admin';
  readOnly?: boolean;
}

const INCIDENT_TYPES = [
  'Unsafe Conditions',
  'Unsafe Act'
];

const CAUSES_OF_INCIDENT = [
  'Lack of Planning',
  'Lack of Supervision',
  'Other trade at fault',
  'Inadequate tools',
  'Lack of training',
  'Instructions ignored',
  'Improper use of PPE',
  'Substance abuse',
  'Policy ignored',
  'Other'
];

export default function GeneralInformationStep({ data, updateData, authType = 'contractor', readOnly = false }: GeneralInformationStepProps) {
  const { t } = useTranslation('common');

  const handleInputChange = (field: string, value: string) => {
    updateData({ [field]: value } as any);
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <ContractorSelect
            label="Reported by"
            value={data.reportedBy}
            onChange={(value) => handleInputChange('reportedBy', value)}
            authType={authType}
            required
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <ContractorSelect
            label="Supervisor"
            value={data.supervisor}
            onChange={(value) => handleInputChange('supervisor', value)}
            authType={authType}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <ProjectSelect
            label="Project Name"
            value={data.projectName}
            onChange={(value) => handleInputChange('projectName', value)}
            authType={authType}
            required
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <SubcontractorSelect
            label="Company/Subcontractor"
            value={data.companySubcontractor}
            onChange={(value) => handleInputChange('companySubcontractor', value)}
            authType={authType}
            returnValue="name"
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safetyRepresentative">Safety Representative</Label>
        <Input
          id="safetyRepresentative"
          value={data.safetyRepresentative}
          onChange={(e) => handleInputChange('safetyRepresentative', e.target.value)}
          placeholder="Enter safety representative name (optional)"
          readOnly={readOnly}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateTimeOfNearMiss">Date & Time of Near Miss</Label>
          <Input
            id="dateTimeOfNearMiss"
            type="datetime-local"
            value={data.dateTimeOfNearMiss}
            onChange={(e) => handleInputChange('dateTimeOfNearMiss', e.target.value)}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTimeManagementNotified">Date & Time Management was notified</Label>
          <Input
            id="dateTimeManagementNotified"
            type="datetime-local"
            value={data.dateTimeManagementNotified}
            onChange={(e) => handleInputChange('dateTimeManagementNotified', e.target.value)}
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whoWasNotified">Who was notified?</Label>
        <Input
          id="whoWasNotified"
          value={data.whoWasNotified}
          onChange={(e) => handleInputChange('whoWasNotified', e.target.value)}
          placeholder="Enter who was notified (optional)"
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="witnessesContactInfo">Witnesses and Contact Information</Label>
        <Textarea
          id="witnessesContactInfo"
          value={data.witnessesContactInfo}
          onChange={(e) => handleInputChange('witnessesContactInfo', e.target.value)}
          placeholder="Each witness and contact email/phone on a line"
          className="min-h-[100px]"
          readOnly={readOnly}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Witnesses statements taken?</Label>
          <RadioGroup
            value={data.witnessStatementsTaken}
            onValueChange={(value) => handleInputChange('witnessStatementsTaken', value)}
            disabled={readOnly}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="statements-taken-yes" />
              <Label htmlFor="statements-taken-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="statements-taken-no" />
              <Label htmlFor="statements-taken-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Witnesses statements attached?</Label>
          <RadioGroup
            value={data.witnessStatementsAttached}
            onValueChange={(value) => handleInputChange('witnessStatementsAttached', value)}
            disabled={readOnly}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="statements-attached-yes" />
              <Label htmlFor="statements-attached-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="statements-attached-no" />
              <Label htmlFor="statements-attached-no">No</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Type of Incident</Label>
          <Select value={data.typeOfIncident} onValueChange={(value) => handleInputChange('typeOfIncident', value)} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Select incident type" />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Cause of Incident</Label>
          <Select value={data.causeOfIncident} onValueChange={(value) => handleInputChange('causeOfIncident', value)} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Select cause of incident" />
            </SelectTrigger>
            <SelectContent>
              {CAUSES_OF_INCIDENT.map((cause) => (
                <SelectItem key={cause} value={cause}>
                  {cause}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data.causeOfIncident === 'Other' && (
        <div className="space-y-2">
          <Label htmlFor="causeOtherExplanation" className="text-base font-semibold">
            Please explain:
          </Label>
          <Textarea
            id="causeOtherExplanation"
            value={data.causeOtherExplanation}
            onChange={(e) => handleInputChange('causeOtherExplanation', e.target.value)}
            placeholder="Please provide details..."
            className="min-h-[80px]"
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
}