"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { useUpdateTimesheetMutation } from "@/lib/features/timesheets/timesheetsApi";
import { ArrowLeft } from "lucide-react";

interface Timesheet {
  id: string;
  userId: string;
  date: string;
  employee: string;
  company: string;
  jobSite: string;
  jobName?: string;
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
  const [formData, setFormData] = useState({
    date: timesheet.date,
    employee: timesheet.employee,
    company: timesheet.company,
    jobSite: timesheet.jobSite,
    jobName: timesheet.jobName || '',
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
      if (!formData.date || !formData.employee || !formData.company || !formData.jobSite || !formData.jobName || !formData.jobDescription || !formData.timeSpent) {
        showToast('All fields are required', 'error');
        return;
      }

      // Validate time spent is a positive number
      const timeSpentNumber = parseFloat(formData.timeSpent);
      if (isNaN(timeSpentNumber) || timeSpentNumber < 0) {
        showToast('Time spent must be a valid positive number', 'error');
        return;
      }

      const result = await updateTimesheet({
        id: timesheet.id,
        date: formData.date,
        employee: formData.employee,
        company: formData.company,
        jobSite: formData.jobSite,
        jobName: formData.jobName,
        jobDescription: formData.jobDescription,
        timeSpent: formData.timeSpent,
        authType: 'admin'
      }).unwrap();

      if (result.success) {
        showToast('Timesheet updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update timesheet', 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to update timesheet', 'error');
    }
  }, [formData, timesheet.id, updateTimesheet, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Edit Timesheet</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timesheet Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date:</Label>
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
              <Label htmlFor="employee">Employee:</Label>
              <Input
                id="employee"
                name="employee"
                value={formData.employee || ''}
                onChange={handleInputChange}
                placeholder="Employee name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company:</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={handleInputChange}
                placeholder="Client company name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobSite">Job Site:</Label>
              <Input
                id="jobSite"
                name="jobSite"
                value={formData.jobSite || ''}
                onChange={handleInputChange}
                placeholder="Company location"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobName">Job Name:</Label>
              <Input
                id="jobName"
                name="jobName"
                value={formData.jobName || ''}
                onChange={handleInputChange}
                placeholder="Name or title of the job"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="timeSpent">Time Spent (hours):</Label>
              <Input
                id="timeSpent"
                name="timeSpent"
                type="number"
                step="0.25"
                min="0"
                value={formData.timeSpent || ''}
                onChange={handleInputChange}
                placeholder="Hours spent on site"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description:</Label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription || ''}
              onChange={handleInputChange}
              placeholder="Information about the job"
              className="min-h-[100px]"
            
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
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