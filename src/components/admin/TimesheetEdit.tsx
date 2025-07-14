"use client";

import { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { useUpdateTimesheetMutation } from "@/lib/features/timesheets/timesheetsApi";
import { ArrowLeft } from "lucide-react";
import ContractorSelect from "@/components/ContractorSelect";

interface Timesheet {
  id: string;
  userId: string;
  date: string;
  employee: string;
  company: string;
  projectName: string;
  jobDescription: string;
  timeSpent: string;
  createdAt: string;
  updatedAt: string;
}

interface TimesheetEditProps {
  timesheet: Timesheet;
  onBack: () => void;
}

export default function TimesheetEdit({ timesheet, onBack }: TimesheetEditProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    date: timesheet.date,
    employee: timesheet.employee,
    company: timesheet.company,
    projectName: timesheet.projectName || '',
    jobDescription: timesheet.jobDescription,
    timeSpent: timesheet.timeSpent,
  });
  
  const [updateTimesheet, { isLoading }] = useUpdateTimesheetMutation();
  const { toast, showToast, hideToast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = useCallback(async () => {
    try {
      // Validate required fields
      if (!formData.date || !formData.employee || !formData.company || !formData.projectName || !formData.jobDescription || !formData.timeSpent) {
        showToast(t('common.allFieldsRequired'), 'error');
        return;
      }

      // Validate time spent is a positive number
      const timeSpentNumber = parseFloat(formData.timeSpent);
      if (isNaN(timeSpentNumber) || timeSpentNumber < 0) {
        showToast(t('common.timeSpentValidNumber'), 'error');
        return;
      }

      const result = await updateTimesheet({
        id: timesheet.id,
        date: formData.date,
        employee: formData.employee,
        company: formData.company,
        projectName: formData.projectName,
        jobDescription: formData.jobDescription,
        timeSpent: formData.timeSpent,
        authType: 'admin'
      }).unwrap();

      if (result.success) {
        showToast(t('common.timesheetUpdatedSuccessfully'), 'success');
      } else {
        showToast(result.error || t('common.failedToUpdateTimesheet'), 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || t('common.failedToUpdateTimesheet'), 'error');
    }
  }, [formData, timesheet.id, updateTimesheet, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{t('admin.editTimesheet')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.timesheetDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">{t('formFields.date')}</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <ContractorSelect
                id="employee"
                name="employee"
                label={`${t('formFields.employee')}`}
                value={formData.employee || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, employee: value }))}
                placeholder={t('formFields.employeeName')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">{t('formFields.company')}</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={handleInputChange}
                placeholder={t('formFields.clientCompanyName')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">{t('formFields.projectName')}</Label>
              <Input
                id="projectName"
                name="projectName"
                value={formData.projectName || ''}
                onChange={handleInputChange}
                placeholder={t('formFields.projectNamePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="timeSpent">{t('formFields.timeSpentHours')}</Label>
              <Input
                id="timeSpent"
                name="timeSpent"
                type="number"
                step="0.25"
                min="0"
                value={formData.timeSpent || ''}
                onChange={handleInputChange}
                placeholder={t('formFields.hoursSpentOnSite')}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">{t('formFields.jobDescription')}</Label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription || ''}
              onChange={handleInputChange}
              placeholder={t('formFields.jobDescriptionPlaceholder')}
              className="min-h-[100px]"
            
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}