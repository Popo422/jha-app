"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSubmitFormMutation } from '@/lib/features/submissions/submissionsApi';
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

export default function EndOfDayV2Page() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading: isSubmitting }] = useSubmitFormMutation();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EndOfDayV2FormData>({
    // Step 1
    subcontractorName: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    
    // Step 2
    completedBy: contractor?.name || '', // Default to current user
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      showToast('Please complete all required fields before submitting.', 'error');
      return;
    }

    try {
      await submitForm({
        submissionType: 'end-of-day-v2',
        projectName: formData.projectName,
        date: formData.date,
        formData: {
          ...formData,
          submittedAt: new Date().toISOString(),
        },
        files: [],
        authType: 'contractor'
      }).unwrap();

      showToast('Foreman End of Day Report submitted successfully!', 'success');
      router.push('/contractor-forms');
    } catch (error: any) {
      console.error('Form submission error:', error);
      showToast(error?.data?.error || 'Failed to submit form', 'error');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <SelectSubcontractorStep data={formData} updateData={updateData} />;
      case 2:
        return <ProjectDetailsStep data={formData} updateData={updateData} />;
      case 3:
        return <FieldEmployeesStep data={formData} updateData={updateData} />;
      case 4:
        return <EndOfShiftReviewStep data={formData} updateData={updateData} onSubmit={handleSubmit} />;
      default:
        return <SelectSubcontractorStep data={formData} updateData={updateData} />;
    }
  };

  return (
    <>
      <Header />
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <AppSidebar />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link
                href="/contractor-forms"
                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Forms
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                End of Day Report
              </h1>
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
                        <Button
                          onClick={handleSubmit}
                          disabled={isSubmitting || !validateCurrentStep()}
                          className="flex items-center"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit to Supervisor'}
                        </Button>
                      ) : (
                        <Button
                          onClick={nextStep}
                          disabled={!validateCurrentStep()}
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
          </div>
        </main>
      </div>
    </>
  );
}