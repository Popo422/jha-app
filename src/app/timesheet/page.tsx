"use client";

import { useState, useCallback, useEffect } from "react";
import { useSubmitTimesheetMutation } from "@/lib/features/timesheets/timesheetsApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TimesheetFormData {
  date: string;
  employee: string;
  company: string;
  jobSite: string;
  jobDescription: string;
  timeSpent: string;
}

export default function TimesheetPage() {
  const { hasAccess, isLoading: moduleLoading } = useModuleAccess('timesheet');
  const [submitTimesheet, { isLoading, isSuccess, isError, error, reset }] = useSubmitTimesheetMutation();
  
  const [formData, setFormData] = useState<TimesheetFormData>({
    date: new Date().toISOString().split("T")[0],
    employee: "",
    company: "",
    jobSite: "",
    jobDescription: "",
    timeSpent: ""
  });

  const resetFormData = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      employee: "",
      company: "",
      jobSite: "",
      jobDescription: "",
      timeSpent: ""
    });
  }, []);

  useEffect(() => {
    if (isSuccess) {
      resetFormData();
    }
  }, [isSuccess, resetFormData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); // Reset mutation state

    await submitTimesheet({ ...formData, authType: 'contractor' });
  }, [formData, submitTimesheet, reset]);

  // Show loading while checking module access
  if (moduleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <AppSidebar />
        <main className="p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Don't render if no access (will redirect)
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">Timesheet Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date:</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      className="w-fit"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee:</Label>
                    <Input
                      id="employee"
                      name="employee"
                      placeholder="Person's Name"
                      value={formData.employee}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company:</Label>
                    <Input
                      id="company"
                      name="company"
                      placeholder="Client Company Name"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobSite">Job Site:</Label>
                    <Input
                      id="jobSite"
                      name="jobSite"
                      placeholder="Company Location"
                      value={formData.jobSite}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="jobDescription">Job Description:</Label>
                    <Textarea
                      id="jobDescription"
                      name="jobDescription"
                      placeholder="Enter information about the job"
                      value={formData.jobDescription}
                      onChange={handleInputChange}
                      required
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeSpent">Time Spent (hours):</Label>
                    <Input
                      id="timeSpent"
                      name="timeSpent"
                      type="number"
                      step="0.25"
                      min="0"
                      max="24"
                      placeholder="Time spent on site"
                      value={formData.timeSpent}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Instructions:</strong> Please fill out all fields to submit your timesheet.
                  </p>
                </div>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    Timesheet submitted successfully!
                  </div>
                )}

                {isError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    {error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data 
                      ? (error.data as any).error 
                      : 'Submission failed'}
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full rounded-none">
                  {isLoading ? 'Submitting...' : 'Submit Timesheet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}