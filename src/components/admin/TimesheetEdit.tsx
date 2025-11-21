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
import { ArrowLeft, XCircle, Check } from "lucide-react";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";

interface Timesheet {
  id: string;
  userId: string;
  date: string;
  employee: string;
  company: string;
  projectName: string;
  jobDescription: string;
  timeSpent: string;
  overtimeHours?: string;
  doubleHours?: string;
  status: string;
  rejectionReason?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimesheetEditProps {
  timesheet: Timesheet;
  onBack: () => void;
  readOnly?: boolean;
}

export default function TimesheetEdit({ timesheet, onBack, readOnly = false }: TimesheetEditProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    date: timesheet.date,
    employee: timesheet.employee,
    company: timesheet.company,
    projectName: timesheet.projectName || '',
    jobDescription: timesheet.jobDescription,
    timeSpent: timesheet.timeSpent,
    overtimeHours: timesheet.overtimeHours || '',
    doubleHours: timesheet.doubleHours || '',
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

      // Validate overtime hours
      const overtimeHoursNumber = formData.overtimeHours ? parseFloat(formData.overtimeHours) : 0;
      if (formData.overtimeHours && (isNaN(overtimeHoursNumber) || overtimeHoursNumber < 0)) {
        showToast('Overtime hours must be a valid positive number', 'error');
        return;
      }

      // Validate double hours
      const doubleHoursNumber = formData.doubleHours ? parseFloat(formData.doubleHours) : 0;
      if (formData.doubleHours && (isNaN(doubleHoursNumber) || doubleHoursNumber < 0)) {
        showToast('Double hours must be a valid positive number', 'error');
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
        overtimeHours: formData.overtimeHours,
        doubleHours: formData.doubleHours,
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
        <h2 className="text-2xl font-bold">
          {readOnly ? t('admin.viewTimesheet') : t('admin.editTimesheet')}
        </h2>
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
                readOnly={readOnly}
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
                authType="admin"
                disabled={readOnly}
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
                readOnly={readOnly}
              />
            </div>
            <div className="space-y-2">
              <ProjectSelect
                id="projectName"
                name="projectName"
                value={formData.projectName || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                label={t('formFields.projectName')}
                placeholder={t('formFields.projectNamePlaceholder')}
                required
                authType="admin"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeSpent">{t('formFields.timeSpentHours')}</Label>
              <Input
                id="timeSpent"
                name="timeSpent"
                type="number"
                step="0.25"
                min="0"
                value={formData.timeSpent || ''}
                onChange={handleInputChange}
                placeholder="Regular hours"
                required
                readOnly={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtimeHours">Overtime Hours</Label>
              <Input
                id="overtimeHours"
                name="overtimeHours"
                type="number"
                step="0.25"
                min="0"
                value={formData.overtimeHours || ''}
                onChange={handleInputChange}
                placeholder="Overtime hours"
                readOnly={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doubleHours">Double Hours</Label>
              <Input
                id="doubleHours"
                name="doubleHours"
                type="number"
                step="0.25"
                min="0"
                value={formData.doubleHours || ''}
                onChange={handleInputChange}
                placeholder="Double time hours"
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Hours Summary */}
          {(formData.timeSpent || formData.overtimeHours || formData.doubleHours) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hours Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Regular:</span>
                  <span className="ml-2 font-medium">{formData.timeSpent || '0'} hrs</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Overtime:</span>
                  <span className="ml-2 font-medium">{formData.overtimeHours || '0'} hrs</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Double:</span>
                  <span className="ml-2 font-medium">{formData.doubleHours || '0'} hrs</span>
                </div>
                <div className="font-semibold">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    {(parseFloat(formData.timeSpent || '0') + 
                      parseFloat(formData.overtimeHours || '0') + 
                      parseFloat(formData.doubleHours || '0')).toFixed(2)} hrs
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="jobDescription">{t('formFields.jobDescription')}</Label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription || ''}
              onChange={handleInputChange}
              placeholder={t('formFields.jobDescriptionPlaceholder')}
              className="min-h-[100px]"
              readOnly={readOnly}
            />
          </div>

          {/* Rejection Reason Display */}
          {timesheet.status === 'rejected' && timesheet.rejectionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-red-100 dark:bg-red-900 rounded-full">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Timesheet Rejected
                  </h4>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <span className="font-medium">Reason:</span> {timesheet.rejectionReason}
                  </div>
                  {timesheet.approvedByName && timesheet.approvedAt && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      Rejected by {timesheet.approvedByName} on {new Date(timesheet.approvedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Approval Status Display */}
          {timesheet.status === 'approved' && timesheet.approvedByName && timesheet.approvedAt && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Timesheet Approved
                  </h4>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Approved by {timesheet.approvedByName} on {new Date(timesheet.approvedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              {readOnly ? t('common.close') : t('common.cancel')}
            </Button>
            {!readOnly && (
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? t('common.saving') : t('common.saveChanges')}
              </Button>
            )}
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