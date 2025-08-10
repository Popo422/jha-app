"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSubmitFormMutation } from '@/lib/features/submissions/submissionsApi';
import { useToast } from '@/components/ui/toast';

// Form step components
import GeneralInformationStep from "@/components/forms/near-miss/GeneralInformationStep";
import NearMissDescriptionStep from "@/components/forms/near-miss/NearMissDescriptionStep";
import ContributingFactorsStep from "@/components/forms/near-miss/ContributingFactorsStep";
import CorrectiveActionsStep from "@/components/forms/near-miss/CorrectiveActionsStep";
import EvidenceStep from "@/components/forms/near-miss/EvidenceStep";
import AcknowledgementStep from "@/components/forms/near-miss/AcknowledgementStep";

interface NearMissFormData {
  // Step 1: General Information
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
  
  // Step 1: Type and Cause (moved from step 2)
  typeOfIncident: string;
  causeOfIncident: string;
  causeOtherExplanation: string;
  
  // Step 2: Near Miss Description
  taskBeingPerformed: string;
  whatAlmostHappened: string;
  potentialConsequences: string;
  anyoneNotEmployed: string;
  pleaseExplainHow: string;
  wasAnyoneAlmostInjured: string;
  wereSafetyProceduresViolated: string;
  
  // Step 3: Contributing Factors
  equipmentMaterialsInvolved: string;
  unsafeBehaviorCondition: string;
  weatherEnvironmentIssues: string;
  wasPPEBeingWorn: string;
  
  // Step 4: Corrective Actions
  actionsTaken: string;
  preventionRecommendations: string;
  
  // Step 5: Evidence
  evidenceFiles: File[];
  
  // Step 6: Acknowledgement
  reporterSignature: string;
  reporterDate: string;
  supervisorSignature: string;
  supervisorDate: string;
}

const STEPS = [
  { number: 1, title: 'General Information', key: 'general' },
  { number: 2, title: 'Near Miss Description', key: 'description' },
  { number: 3, title: 'Contributing Factors', key: 'factors' },
  { number: 4, title: 'Corrective Actions', key: 'actions' },
  { number: 5, title: 'Evidence', key: 'evidence' },
  { number: 6, title: 'Acknowledgement', key: 'acknowledgement' },
];

export default function NearMissReportPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [submitForm, { isLoading: isSubmitting }] = useSubmitFormMutation();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<NearMissFormData>({
    reportedBy: '',
    supervisor: '',
    projectName: '',
    companySubcontractor: '',
    safetyRepresentative: '',
    dateTimeOfNearMiss: '',
    dateTimeManagementNotified: '',
    whoWasNotified: '',
    witnessesContactInfo: '',
    witnessStatementsTaken: '',
    witnessStatementsAttached: '',
    typeOfIncident: '',
    causeOfIncident: '',
    causeOtherExplanation: '',
    taskBeingPerformed: '',
    whatAlmostHappened: '',
    potentialConsequences: '',
    anyoneNotEmployed: '',
    pleaseExplainHow: '',
    wasAnyoneAlmostInjured: '',
    wereSafetyProceduresViolated: '',
    equipmentMaterialsInvolved: '',
    unsafeBehaviorCondition: '',
    weatherEnvironmentIssues: '',
    wasPPEBeingWorn: '',
    actionsTaken: '',
    preventionRecommendations: '',
    evidenceFiles: [],
    reporterSignature: '',
    reporterDate: new Date().toISOString().split('T')[0],
    supervisorSignature: '',
    supervisorDate: new Date().toISOString().split('T')[0],
  });

  const updateFormData = (updates: Partial<NearMissFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // General Information - Only require what admins need to see
        return !!(
          formData.reportedBy &&
          formData.projectName &&
          formData.dateTimeOfNearMiss
        );
      case 2: // Near Miss Description - Core incident details
        return !!(
          formData.whatAlmostHappened
        );
      case 3: // Contributing Factors - All optional
        return true;
      case 4: // Corrective Actions - All optional
        return true;
      case 5: // Evidence - optional step
        return true;
      case 6: // Acknowledgement - Only reporter info required
        return !!(
          formData.reporterSignature &&
          formData.reporterDate
        );
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else if (!validateCurrentStep()) {
      showToast('Please complete all required fields before proceeding to the next step.', 'error');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      showToast('Please complete all required fields before submitting.', 'error');
      return;
    }

    try {
      // Collect all files from the form
      const allFiles: File[] = [
        ...formData.evidenceFiles
      ];

      // Create form data for submission
      const submissionData = {
        submissionType: 'near-miss-report' as const,
        projectName: formData.projectName,
        date: formData.reporterDate,
        formData: {
          ...formData,
          submittedAt: new Date().toISOString(),
        },
        files: allFiles.length > 0 ? allFiles : undefined,
        authType: 'contractor' as const
      };

      console.log('Submitting near miss report:', submissionData);
      
      const result = await submitForm(submissionData).unwrap();
      
      if (result.success) {
        showToast('Near miss report submitted successfully!', 'success');
        // Add delay to show the toast before redirecting
      } else {
        throw new Error(result.error || 'Submission failed');
      }
      
    } catch (error: any) {
      console.error('Error submitting near miss report:', error);
      showToast(error?.data?.error || error?.message || 'There was an error submitting your report. Please try again.', 'error');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <GeneralInformationStep
            data={formData}
            updateData={updateFormData}
          />
        );
      case 2:
        return (
          <NearMissDescriptionStep
            data={formData}
            updateData={updateFormData}
          />
        );
      case 3:
        return (
          <ContributingFactorsStep
            data={formData}
            updateData={updateFormData}
          />
        );
      case 4:
        return (
          <CorrectiveActionsStep
            data={formData}
            updateData={updateFormData}
          />
        );
      case 5:
        return (
          <EvidenceStep
            data={formData}
            updateData={updateFormData}
          />
        );
      case 6:
        return (
          <AcknowledgementStep
            data={formData}
            updateData={updateFormData}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/contractor-forms" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Forms
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground text-center">
              Near Miss Report
            </h1>
          </div>

          {/* Step Progress Indicator */}
          <div className="mb-8">
            <div className="hidden md:flex justify-center gap-2 lg:gap-3 mb-4 overflow-x-auto">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-full text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    step.number === currentStep
                      ? 'bg-blue-500 text-white shadow-lg'
                      : step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 bg-white/20 rounded-full text-xs lg:text-sm font-semibold">
                    {step.number}
                  </span>
                  <span className="text-xs lg:text-sm">{step.title}</span>
                </div>
              ))}
            </div>
            
            {/* Mobile step indicator */}
            <div className="md:hidden">
              <div className="flex justify-center gap-2 mb-4 overflow-x-auto px-4">
                {STEPS.map((step) => (
                  <div
                    key={step.number}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      step.number === currentStep
                        ? 'bg-blue-500 text-white shadow-lg'
                        : step.number < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded-full text-xs font-semibold">
                      {step.number}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">
                {STEPS[currentStep - 1].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCurrentStep()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-4">
              {currentStep < STEPS.length && !validateCurrentStep() && (
                <p className="text-sm text-red-500">
                  Please complete all required fields
                </p>
              )}
              
              {currentStep < STEPS.length ? (
                <Button
                  onClick={nextStep}
                  disabled={!validateCurrentStep()}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!validateCurrentStep() || isSubmitting}
                  className="bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}