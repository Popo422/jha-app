"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Calendar } from "lucide-react";
import WorkmenSelectionStep from "./WorkmenSelectionStep";
import TimeFrameSelectionStep from "./TimeFrameSelectionStep";
import PayrollDetailsStep from "./PayrollDetailsStep";
import PayrollDataWizard from "./PayrollDataWizard";
import PayrollDetailsForm from "./PayrollDetailsForm";
import PayrollUploadWizard from "./PayrollUploadWizard";
import BulkAIUploadWizard from "./BulkAIUploadWizard";
import CertifiedPayrollReportPreview from "./CertifiedPayrollReportPreview";
import { useGetProjectContractorsQuery, useCalculateMultiWeekPayrollMutation, useUploadPayrollMutation, useBulkExtractPayrollMutation } from "@/lib/features/certified-payroll/certifiedPayrollApi";

interface CertifiedPayrollWizardProps {
  projectId: string;
}

type WizardStep = "onboarding" | "select-workmen" | "select-timeframe" | "add-details" | "payroll-wizard" | "payroll-form" | "payroll-upload" | "bulk-ai-upload" | "generate-report";

export default function CertifiedPayrollWizard({ projectId }: CertifiedPayrollWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("onboarding");
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [selectedContractorForPayroll, setSelectedContractorForPayroll] = useState<string | null>(null);
  const [savedPayrollData, setSavedPayrollData] = useState<Map<string, any>>(new Map());
  const [extractedPayrollData, setExtractedPayrollData] = useState<any>(null);
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  
  // Get contractor data for the payroll wizard
  const { data: contractorsData } = useGetProjectContractorsQuery(projectId);
  
  // Multi-week payroll calculation mutation
  const [calculateMultiWeekPayroll, { isLoading: isCalculatingPayroll }] = useCalculateMultiWeekPayrollMutation();
  
  // Bulk AI upload mutations
  const [uploadPayroll] = useUploadPayrollMutation();
  const [bulkExtractPayroll] = useBulkExtractPayrollMutation();

  // Debug logging to check state
  console.log('Current wizard state:', {
    currentStep,
    selectedContractors,
    selectedDateRange
  });

  const handleNext = () => {
    if (currentStep === "onboarding") {
      setCurrentStep("select-workmen");
    } else if (currentStep === "select-workmen") {
      setCurrentStep("select-timeframe");
    } else if (currentStep === "select-timeframe") {
      setCurrentStep("add-details");
    } else {
      // Navigate back to project dashboard with the Time & Cost tab
      router.push(`/admin/project-dashboard/${projectId}?tab=time-cost`);
    }
  };

  const handleBack = () => {
    if (currentStep === "select-workmen") {
      setCurrentStep("onboarding");
    } else if (currentStep === "select-timeframe") {
      setCurrentStep("select-workmen");
    } else if (currentStep === "add-details") {
      setCurrentStep("select-timeframe");
    } else {
      router.push(`/admin/project-dashboard/${projectId}?tab=time-cost`);
    }
  };

  const handleWorkmenNext = (contractorIds: string[]) => {
    setSelectedContractors(contractorIds);
    setCurrentStep("select-timeframe");
  };

  const handleTimeFrameNext = (startDate: string, endDate: string) => {
    setSelectedDateRange({ startDate, endDate });
    setCurrentStep("add-details");
  };

  const handleAddPayrollData = (contractorId: string) => {
    setSelectedContractorForPayroll(contractorId);
    // Clear any previous extracted data when switching contractors
    setExtractedPayrollData(null);
    setIsViewMode(false);
    setCurrentStep("payroll-wizard");
  };

  const handleViewPayrollData = (contractorId: string) => {
    setSelectedContractorForPayroll(contractorId);
    // Clear any previous extracted data when switching contractors
    setExtractedPayrollData(null);
    setIsViewMode(true);
    setCurrentStep("payroll-form");
  };

  const handleBackFromPayrollWizard = () => {
    setCurrentStep("add-details");
    setSelectedContractorForPayroll(null);
    // Clear extracted data when going back
    setExtractedPayrollData(null);
  };

  const handleAddManually = () => {
    setCurrentStep("payroll-form");
  };

  const handleUploadPdf = () => {
    setCurrentStep("payroll-upload");
  };

  const handleBackFromPayrollForm = () => {
    if (isViewMode) {
      // If coming from View button, go back to the list
      setCurrentStep("add-details");
      setSelectedContractorForPayroll(null);
      setIsViewMode(false);
    } else {
      // If coming from regular flow, go back to payroll options
      setCurrentStep("payroll-wizard");
    }
  };

  const handleSavePayrollData = (payrollData: any) => {
    if (selectedContractorForPayroll) {
      // Save to state Map using contractor ID as key
      setSavedPayrollData(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedContractorForPayroll, payrollData);
        return newMap;
      });
      
      console.log('Payroll data saved to state for contractor:', selectedContractorForPayroll, payrollData);
    }
    
    // Go back to add-details step and clear states
    setCurrentStep("add-details");
    setSelectedContractorForPayroll(null);
    setExtractedPayrollData(null);
    setIsViewMode(false);
  };

  const handleGenerateReport = () => {
    setCurrentStep("generate-report");
  };

  const handleBackFromReport = () => {
    setCurrentStep("add-details");
  };

  // Convert Map to stable object for dependency tracking
  const payrollDataObject = useMemo(() => {
    const obj: Record<string, any> = {};
    savedPayrollData.forEach((data, contractorId) => {
      obj[contractorId] = data;
    });
    return obj;
  }, [savedPayrollData]);

  // Generate enhanced report data using real timesheet calculations
  const generateEnhancedReportData = useCallback(async () => {
    if (!contractorsData?.contractors || !selectedDateRange) {
      return null;
    }

    try {
      // Use the stable payroll data object
      const payrollDataMap = payrollDataObject;

      // Call the multi-week calculation API
      const result = await calculateMultiWeekPayroll({
        projectId,
        startDate: selectedDateRange.startDate,
        endDate: selectedDateRange.endDate,
        selectedContractorIds: selectedContractors,
        payrollData: payrollDataMap
      }).unwrap();

      if (!result.success || !result.data) {
        console.error('API returned unsuccessful result:', result);
        return null;
      }

      // Transform the API response to match the expected format
      const apiData = result.data;
      
      // Check if it's multi-week data
      if (apiData.weeks && apiData.weeks.length > 0) {
        // Multi-week format
        return {
          weekStart: apiData.weekStart,
          weekEnd: apiData.weekEnd,
          projectName: apiData.projectName,
          projectInfo: apiData.projectInfo,
          subcontractorInfo: apiData.subcontractorInfo,
          workers: [], // Not used for multi-week
          weeks: apiData.weeks
        };
      } else {
        // Single week format (fallback)
        return {
          weekStart: apiData.weekStart,
          weekEnd: apiData.weekEnd,
          projectName: apiData.projectName,
          projectInfo: apiData.projectInfo,
          subcontractorInfo: apiData.subcontractorInfo,
          workers: apiData.weeks?.[0]?.workers || []
        };
      }
    } catch (error) {
      console.error('Error calculating multi-week payroll:', error);
      return null;
    }
  }, [
    contractorsData?.contractors,
    selectedDateRange,
    selectedContractors,
    projectId,
    payrollDataObject
  ]);

  const handleBackFromUpload = () => {
    setCurrentStep("payroll-wizard");
  };

  const handleExtractedData = (extractedData: any) => {
    // Store the extracted data and move to the form
    setExtractedPayrollData(extractedData);
    setCurrentStep("payroll-form");
  };

  const handleBulkAIUpload = async () => {
    setCurrentStep("bulk-ai-upload");
  };

  const handleBackFromBulkAI = () => {
    setCurrentStep("add-details");
  };

  const handleBulkAICompleted = (extractedWorkers: any[]) => {
    // Process the bulk extracted data and save to state
    extractedWorkers.forEach(worker => {
      if (worker.contractorId) {
        setSavedPayrollData(prev => {
          const newMap = new Map(prev);
          newMap.set(worker.contractorId, {
            // Remove the matching fields and just save the payroll data
            federalTax: worker.federalTax,
            socialSecurity: worker.socialSecurity,
            medicare: worker.medicare,
            stateTax: worker.stateTax,
            localTaxesSDI: worker.localTaxesSDI,
            voluntaryPension: worker.voluntaryPension,
            voluntaryMedical: worker.voluntaryMedical,
            vacDues: worker.vacDues,
            travSubs: worker.travSubs,
            allOtherDeductions: worker.allOtherDeductions,
            totalDeduction: worker.totalDeduction,
            rateInLieuOfFringes: worker.rateInLieuOfFringes,
            totalBaseRatePlusFringes: worker.totalBaseRatePlusFringes,
            hwRate: worker.hwRate,
            healthWelfare: worker.healthWelfare,
            pensionRate: worker.pensionRate,
            pension: worker.pension,
            vacHolRate: worker.vacHolRate,
            vacationHoliday: worker.vacationHoliday,
            trainingRate: worker.trainingRate,
            allOtherFringes: worker.allOtherFringes,
            allOtherRate: worker.allOtherRate,
            totalFringeRateToThird: worker.totalFringeRateToThird,
            totalFringesPaidToThird: worker.totalFringesPaidToThird,
            checkNo: worker.checkNo,
            netPaidWeek: worker.netPaidWeek,
            savings: worker.savings,
            payrollPaymentDate: worker.payrollPaymentDate,
            allOrPartOfFringesPaidToEmployee: worker.allOrPartOfFringesPaidToEmployee,
            vacationHolidayDuesInGrossPay: worker.vacationHolidayDuesInGrossPay,
            voluntaryContributionsInGrossPay: worker.voluntaryContributionsInGrossPay
          });
          return newMap;
        });
      }
    });
    
    // Go back to the add-details step
    setCurrentStep("add-details");
  };

  const handleGoBack = () => {
    router.push(`/admin/project-dashboard/${projectId}?tab=time-cost`);
  };

  // Get contractor data for the wizard
  const selectedContractorInfo = contractorsData?.contractors.find(
    contractor => contractor.id === selectedContractorForPayroll
  );

  // Show PayrollDataWizard as full screen
  if (currentStep === "payroll-wizard" && selectedContractorInfo && selectedDateRange) {
    return (
      <PayrollDataWizard
        contractorName={selectedContractorInfo.name}
        contractorId={selectedContractorInfo.id}
        dateRange={selectedDateRange}
        onBack={handleBackFromPayrollWizard}
        onAddManually={handleAddManually}
        onUploadPdf={handleUploadPdf}
      />
    );
  }

  // Show PayrollUploadWizard as full screen  
  if (currentStep === "payroll-upload" && selectedContractorInfo && selectedDateRange) {
    return (
      <PayrollUploadWizard
        contractorName={selectedContractorInfo.name}
        contractorId={selectedContractorInfo.id}
        dateRange={selectedDateRange}
        onBack={handleBackFromUpload}
        onExtracted={handleExtractedData}
      />
    );
  }

  // Show PayrollDetailsForm as full screen
  if (currentStep === "payroll-form" && selectedContractorInfo && selectedDateRange) {
    // Prioritize extracted data over existing saved data
    const existingPayrollData = selectedContractorForPayroll 
      ? savedPayrollData.get(selectedContractorForPayroll) 
      : null;
    
    const initialFormData = extractedPayrollData || existingPayrollData;
    const isViewingExistingData = !!existingPayrollData && !extractedPayrollData;

    return (
      <PayrollDetailsForm
        contractorName={selectedContractorInfo.name}
        contractorId={selectedContractorInfo.id}
        dateRange={selectedDateRange}
        initialData={initialFormData}
        isViewMode={isViewingExistingData}
        onBack={handleBackFromPayrollForm}
        onSave={handleSavePayrollData}
      />
    );
  }

  // Show Bulk AI Upload Wizard
  if (currentStep === "bulk-ai-upload" && contractorsData?.contractors && selectedDateRange) {
    const selectedContractorData = contractorsData.contractors.filter(
      contractor => selectedContractors.includes(contractor.id)
    );
    
    return (
      <BulkAIUploadWizard
        contractors={selectedContractorData}
        dateRange={selectedDateRange}
        onBack={handleBackFromBulkAI}
        onCompleted={handleBulkAICompleted}
      />
    );
  }

  // Show Enhanced Report Generation
  if (currentStep === "generate-report") {
    return (
      <CertifiedPayrollReportPreview
        generateReportData={generateEnhancedReportData}
        isCalculating={isCalculatingPayroll}
        onBack={handleBackFromReport}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Go Back button outside the widget */}
      <Button 
        variant="ghost" 
        onClick={handleGoBack}
        className="text-blue-600 hover:text-blue-700"
      >
        Go Back
      </Button>

      {currentStep === "select-workmen" ? (
        <WorkmenSelectionStep
          projectId={projectId}
          onNext={handleWorkmenNext}
          onBack={handleBack}
        />
      ) : currentStep === "select-timeframe" ? (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8">
            <TimeFrameSelectionStep
              selectedContractors={selectedContractors}
              initialDateRange={selectedDateRange}
              onNext={handleTimeFrameNext}
              onBack={handleBack}
            />
          </CardContent>
        </Card>
      ) : currentStep === "add-details" ? (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8">
            <PayrollDetailsStep
              projectId={projectId}
              selectedContractors={selectedContractors}
              selectedDateRange={selectedDateRange}
              savedPayrollData={savedPayrollData}
              onNext={handleNext}
              onBack={handleBack}
              onAddPayrollData={handleAddPayrollData}
              onViewPayrollData={handleViewPayrollData}
              onBulkAIUpload={handleBulkAIUpload}
              onGenerateReport={handleGenerateReport}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Generate Certified Payroll</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Create your certified payroll by following this guided experience.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="text-center space-y-3">
                  <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center ${
                    currentStep === "onboarding" 
                      ? "bg-cyan-100 dark:bg-cyan-900" 
                      : "bg-gray-100 dark:bg-gray-900"
                  }`}>
                    <Users className={`w-6 h-6 ${
                      currentStep === "onboarding"
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-gray-400"
                    }`} />
                  </div>
                  <h3 className={`font-semibold ${
                    currentStep === "onboarding" 
                      ? "text-gray-900 dark:text-gray-100" 
                      : "text-gray-600 dark:text-gray-400"
                  }`}>Select Workmen</h3>
                  <p className="text-sm text-muted-foreground">Select the employees to add to this certified payroll.</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                    <Calendar className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">Select Time Frame</h3>
                  <p className="text-sm text-muted-foreground">Select the time frame this certified payroll report is for.</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-900/20">
                    <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">Add Payroll Details</h3>
                  <p className="text-sm text-muted-foreground">Add payroll information using a form or upload your payroll report.</p>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                {currentStep === "onboarding" ? (
                  <Button 
                    onClick={handleNext}
                    className="bg-black hover:bg-gray-800 text-white px-8 py-2 rounded-md"
                  >
                    Next
                  </Button>
                ) : (
                  <div className="flex justify-between w-full">
                    <Button 
                      variant="outline"
                      onClick={handleBack}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleNext}
                      className="bg-black hover:bg-gray-800 text-white px-8 py-2 rounded-md"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}