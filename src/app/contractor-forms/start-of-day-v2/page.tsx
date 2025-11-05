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
import SelectSubcontractorStep from "@/components/forms/start-of-day-v2/SelectSubcontractorStep";
import ProjectDetailsStep from "@/components/forms/start-of-day-v2/ProjectDetailsStep";
import FieldEmployeesStep from "@/components/forms/start-of-day-v2/FieldEmployeesStep";
import SafetyInformationStep from "@/components/forms/start-of-day-v2/SafetyInformationStep";
import SafetyProtocolStepsStep from "@/components/forms/start-of-day-v2/SafetyProtocolStepsStep";

interface FieldEmployee {
  id: string;
  name: string;
  working: boolean;
  startTime: string;
  status: 'free-of-injury' | 'injured';
  signature: string;
}

interface SafetySection {
  [key: string]: boolean;
}

interface SafetySectionWithCustom {
  selected: SafetySection;
  customItems: string[];
}

interface StartOfDayV2FormData {
  // Step 1: Select Subcontractor
  subcontractorName: string;
  
  // Step 2: Project Details
  projectName: string;
  date: string;
  supervisor: string;
  completedBy: string;
  
  // Step 3: Field Employees
  fieldEmployees: FieldEmployee[];
  
  // Step 4: Safety Information
  additionalPPE: SafetySectionWithCustom;
  focus6: SafetySectionWithCustom;
  impacts: SafetySectionWithCustom;
  permits: SafetySectionWithCustom;
  equipmentInspections: SafetySectionWithCustom;
  
  // Step 5: Safety Protocol Steps
  listTheSteps: string[];
  identifyHazards: string[];
  protectionMethods: string[];
}

const STEPS = [
  { number: 1, title: 'Select Subcontractor', key: 'subcontractor' },
  { number: 2, title: 'Project Details', key: 'project' },
  { number: 3, title: 'Field Employees', key: 'employees' },
  { number: 4, title: 'Safety Information', key: 'safety' },
  { number: 5, title: 'Safety Steps', key: 'steps' },
];

export default function StartOfDayV2Page() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading: isSubmitting }] = useSubmitFormMutation();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StartOfDayV2FormData>({
    // Step 1
    subcontractorName: '',
    
    // Step 2
    projectName: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    supervisor: '',
    completedBy: contractor?.name || '', // Default to current user
    
    // Step 3
    fieldEmployees: [],
    
    // Step 4
    additionalPPE: {
      selected: {
        respirator: false,
        faceProtection: false,
        hearingProtection: false,
      },
      customItems: []
    },
    focus6: {
      selected: {
        falls: false,
        electrocution: false,
        evacuation: false,
        craneLIfting: false,
        caughtInBetween: false,
        struckBy: false,
      },
      customItems: []
    },
    impacts: {
      selected: {
        weather: false,
        environment: false,
        public: false,
        traffic: false,
      },
      customItems: []
    },
    permits: {
      selected: {
        hotWork: false,
        confinedSpace: false,
        evacuation: false,
        criticalLift: false,
        lockoutTagout: false,
      },
      customItems: []
    },
    equipmentInspections: {
      selected: {
        fallProtection: false,
        rigging: false,
        scaffoldShoring: false,
      },
      customItems: []
    },
    
    // Step 5
    listTheSteps: ['', '', '', '', ''],
    identifyHazards: ['', '', '', '', ''],
    protectionMethods: ['', '', '', '', ''],
  });

  const updateData = (updates: Partial<StartOfDayV2FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.subcontractorName;
      case 2:
        return !!(formData.projectName && formData.date && formData.supervisor && formData.completedBy);
      case 3:
        return formData.fieldEmployees.length > 0 && 
               formData.fieldEmployees.every(emp => emp.name && emp.signature);
      case 4:
        // At least one safety item should be selected or custom item added
        return true; // Optional step
      case 5:
        // At least some steps should be filled
        return formData.listTheSteps.some(step => step.trim()) ||
               formData.identifyHazards.some(step => step.trim()) ||
               formData.protectionMethods.some(step => step.trim());
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
        submissionType: 'start-of-day-v2',
        projectName: formData.projectName,
        date: formData.date,
        formData: {
          ...formData,
          submittedAt: new Date().toISOString(),
        },
        files: [],
        authType: 'contractor'
      }).unwrap();

      showToast('Foreman Start of Day Report submitted successfully!', 'success');
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
        return <SafetyInformationStep data={formData} updateData={updateData} />;
      case 5:
        return <SafetyProtocolStepsStep data={formData} updateData={updateData} onSubmit={handleSubmit} />;
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
                Foreman Start of Day Report
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
                          {isSubmitting ? 'Submitting...' : 'Submit Report'}
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