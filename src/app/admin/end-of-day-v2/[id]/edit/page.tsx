"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useGetSubmissionQuery, useUpdateSubmissionMutation } from '@/lib/features/submissions/submissionsApi';
import { useToast } from '@/components/ui/toast';

// Form step components
import SelectSubcontractorStep from "@/components/forms/end-of-day-v2/SelectSubcontractorStep";
import ProjectDetailsStep from "@/components/forms/end-of-day-v2/ProjectDetailsStep";
import FieldEmployeesStep from "@/components/forms/end-of-day-v2/FieldEmployeesStep";
import EndOfShiftReviewStep from "@/components/forms/end-of-day-v2/EndOfShiftReviewStep";

interface FieldEmployee {
  id: string;
  name: string;
  working: boolean;
  hoursWorked: number;
  statusAtLunch: 'free-of-injury' | 'injured';
  statusAtEndOfDay: 'free-of-injury' | 'injured';
  signature: string;
}

interface EndOfDayV2FormData {
  // Step 1: Select Subcontractor
  subcontractorName: string;
  date: string;
  
  // Step 2: Project Details
  completedBy: string;
  supervisor: string;
  projectName: string;
  
  // Step 3: Field Employees
  fieldEmployees: FieldEmployee[];
  
  // Step 4: End of Shift Review
  nearMissesIncidents: string;
  cleanupConfirmation: string;
  performDifferently: string;
  additionalEquipment: string;
  supervisorSignature: string;
  supervisorName: string;
}

const STEPS = [
  { number: 1, title: 'Select Subcontractor', key: 'subcontractor' },
  { number: 2, title: 'Project Details', key: 'project' },
  { number: 3, title: 'Field Employees', key: 'employees' },
  { number: 4, title: 'End of Shift Review', key: 'review' },
];

export default function AdminEditEndOfDayV2Page() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const readOnly = searchParams.get('view') === 'true';
  const { showToast } = useToast();
  
  const { data: submission, isLoading: isLoadingSubmission } = useGetSubmissionQuery(submissionId);
  const [updateSubmission, { isLoading: isUpdating }] = useUpdateSubmissionMutation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EndOfDayV2FormData>({
    // Step 1
    subcontractorName: '',
    date: new Date().toISOString().split('T')[0],
    
    // Step 2
    completedBy: '',
    supervisor: '',
    projectName: '',
    
    // Step 3
    fieldEmployees: [],
    
    // Step 4
    nearMissesIncidents: '',
    cleanupConfirmation: '',
    performDifferently: '',
    additionalEquipment: '',
    supervisorSignature: '',
    supervisorName: '',
  });

  // Initialize form data when submission loads
  React.useEffect(() => {
    if (submission?.formData) {
      setFormData(prev => ({
        ...prev,
        ...submission.formData,
      }));
    }
  }, [submission]);

  const updateData = (updates: Partial<EndOfDayV2FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.subcontractorName && formData.date);
      case 2:
        return !!(formData.completedBy && formData.supervisor && formData.projectName);
      case 3:
        return formData.fieldEmployees.length > 0 && 
               formData.fieldEmployees.every(emp => emp.name && emp.signature);
      case 4:
        return !!(formData.supervisorName && formData.supervisorSignature);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else if (!validateCurrentStep()) {
      showToast('Please complete all required fields before proceeding.', 'error');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) {
      showToast('Please complete all required fields before saving.', 'error');
      return;
    }

    try {
      const result = await updateSubmission({
        id: submissionId,
        formData: {
          ...formData,
          updatedAt: new Date().toISOString(),
        }
      }).unwrap();
      
      if (result.success) {
        showToast('Foreman End of Day Report updated successfully!', 'success');
        // Add delay to show the toast before redirecting
        setTimeout(() => {
          router.push('/admin/safety-forms');
        }, 2000);
      } else {
        throw new Error(result.error || 'Update failed');
      }
      
    } catch (error: any) {
      console.error('Error updating end of day report:', error);
      showToast(error?.data?.error || error?.message || 'There was an error updating the report. Please try again.', 'error');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <SelectSubcontractorStep data={formData} updateData={updateData} authType="admin" readOnly={readOnly} />;
      case 2:
        return <ProjectDetailsStep data={formData} updateData={updateData} authType="admin" readOnly={readOnly} />;
      case 3:
        return <FieldEmployeesStep data={formData} updateData={updateData} readOnly={readOnly} />;
      case 4:
        return <EndOfShiftReviewStep data={formData} updateData={updateData} onSubmit={handleSave} readOnly={readOnly} />;
      default:
        return <SelectSubcontractorStep data={formData} updateData={updateData} authType="admin" readOnly={readOnly} />;
    }
  };

  if (isLoadingSubmission) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading end of day report...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">End of day report not found.</p>
              <Button onClick={() => router.back()} className="mt-4">
                Back to Safety Forms
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Safety Forms
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {readOnly ? 'View Foreman End of Day Report' : 'Edit Foreman End of Day Report'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Submitted by {submission.completedBy} on {new Date(submission.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Single Card Container */}
          <Card className="min-h-[800px]">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[800px]">
                {/* Steps Sidebar */}
                <div className="lg:col-span-1 p-6">
                  <div className="space-y-4">
                    {STEPS.map((step) => (
                      <div key={step.number} className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step.number < currentStep
                              ? 'bg-green-500 text-white'
                              : step.number === currentStep
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {step.number < currentStep ? '✓' : step.number}
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            step.number === currentStep
                              ? 'text-blue-600 dark:text-blue-400'
                              : step.number < currentStep
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {step.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Content */}
                <div className="lg:col-span-3 p-6 flex flex-col">
                  <div className="flex-1">
                    {renderCurrentStep()}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="flex items-center"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>

                    {currentStep === STEPS.length ? (
                      !readOnly && (
                        <Button
                          onClick={handleSave}
                          disabled={isUpdating || !validateCurrentStep()}
                          className="flex items-center"
                        >
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={nextStep}
                        disabled={readOnly ? false : !validateCurrentStep()}
                        className="flex items-center"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Note */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              {readOnly ? 'Admin View Mode' : 'Admin Edit Mode'}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {readOnly 
                ? 'You are viewing this submission as an administrator in read-only mode.' 
                : 'You are editing this submission as an administrator. Changes will be saved and logged for audit purposes.'
              }
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}