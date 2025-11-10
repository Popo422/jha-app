"use client";

import { useState } from "react";
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
import CertifiedPayrollReportPreview from "./CertifiedPayrollReportPreview";
import { useGetProjectContractorsQuery } from "@/lib/features/certified-payroll/certifiedPayrollApi";

interface CertifiedPayrollWizardProps {
  projectId: string;
}

type WizardStep = "onboarding" | "select-workmen" | "select-timeframe" | "add-details" | "payroll-wizard" | "payroll-form" | "payroll-upload" | "generate-report";

export default function CertifiedPayrollWizard({ projectId }: CertifiedPayrollWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("onboarding");
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [selectedContractorForPayroll, setSelectedContractorForPayroll] = useState<string | null>(null);
  const [savedPayrollData, setSavedPayrollData] = useState<Map<string, any>>(new Map());
  const [extractedPayrollData, setExtractedPayrollData] = useState<any>(null);
  
  // Get contractor data for the payroll wizard
  const { data: contractorsData } = useGetProjectContractorsQuery(projectId);

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
    setCurrentStep("payroll-wizard");
  };

  const handleBackFromPayrollWizard = () => {
    setCurrentStep("add-details");
    setSelectedContractorForPayroll(null);
  };

  const handleAddManually = () => {
    setCurrentStep("payroll-form");
  };

  const handleUploadPdf = () => {
    setCurrentStep("payroll-upload");
  };

  const handleBackFromPayrollForm = () => {
    setCurrentStep("payroll-wizard");
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
    
    // Go back to add-details step
    setCurrentStep("add-details");
    setSelectedContractorForPayroll(null);
  };

  const handleGenerateReport = () => {
    setCurrentStep("generate-report");
  };

  const handleBackFromReport = () => {
    setCurrentStep("add-details");
  };

  // Generate enhanced report data combining contractor info with payroll data
  const generateEnhancedReportData = () => {
    if (!contractorsData?.contractors || !selectedDateRange) {
      return null;
    }

    const enhancedWorkers = selectedContractors.map(contractorId => {
      const contractor = contractorsData.contractors.find(c => c.id === contractorId);
      const payrollData = savedPayrollData.get(contractorId) || {};
      
      if (!contractor) return null;

      return {
        id: contractor.id,
        name: contractor.name,
        address: 'Address not specified', // Can be enhanced with contractor address
        ssn: 'XXX-XX-1234', // Masked for security
        driversLicense: 'Not specified',
        ethnicity: 'Not specified',
        gender: 'Not specified', 
        workClassification: 'Operating Engineer HWY 1/',
        location: 'Project Site',
        type: contractor.role || 'contractor',
        dailyHours: {
          sunday: { straight: 0, overtime: 0, double: 0 },
          monday: { straight: 8, overtime: 0, double: 0 }, // Sample data
          tuesday: { straight: 8, overtime: 0, double: 0 },
          wednesday: { straight: 8, overtime: 0, double: 0 },
          thursday: { straight: 8, overtime: 0, double: 0 },
          friday: { straight: 8, overtime: 0, double: 0 },
          saturday: { straight: 0, overtime: 0, double: 0 },
        },
        totalHours: { straight: 40, overtime: 0, double: 0 },
        baseHourlyRate: 25.00,
        overtimeRate: 37.50,
        doubleTimeRate: 50.00,
        grossAmount: 1000.00,
        deductions: {
          federalTax: parseFloat(payrollData.federalTax) || 0,
          socialSecurity: parseFloat(payrollData.socialSecurity) || 0,
          medicare: parseFloat(payrollData.medicare) || 0,
          stateTax: parseFloat(payrollData.stateTax) || 0,
          localTaxesSDI: parseFloat(payrollData.localTaxesSDI) || 0,
          allOtherDeductions: parseFloat(payrollData.allOtherDeductions) || 0,
          totalDeduction: parseFloat(payrollData.totalDeduction) || 0,
        },
        fringes: {
          healthWelfare: parseFloat(payrollData.healthWelfare) || 0,
          pension: parseFloat(payrollData.pension) || 0,
          training: parseFloat(payrollData.trainingRate) || 0,
        },
        payments: {
          checkNo: payrollData.checkNo || '',
          netPaidWeek: parseFloat(payrollData.netPaidWeek) || 0,
          savings: parseFloat(payrollData.savings) || 0,
        }
      };
    }).filter(Boolean);

    return {
      weekStart: selectedDateRange.startDate,
      weekEnd: selectedDateRange.endDate,
      projectName: 'Project Name', // Get from project data
      workers: enhancedWorkers
    };
  };

  const handleBackFromUpload = () => {
    setCurrentStep("payroll-wizard");
  };

  const handleExtractedData = (extractedData: any) => {
    // Store the extracted data and move to the form
    setExtractedPayrollData(extractedData);
    setCurrentStep("payroll-form");
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

    return (
      <PayrollDetailsForm
        contractorName={selectedContractorInfo.name}
        contractorId={selectedContractorInfo.id}
        dateRange={selectedDateRange}
        initialData={initialFormData}
        onBack={handleBackFromPayrollForm}
        onSave={handleSavePayrollData}
      />
    );
  }

  // Show Enhanced Report Generation
  if (currentStep === "generate-report") {
    const reportData = generateEnhancedReportData();
    
    if (!reportData) {
      return (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-red-600">Error generating report data. Please go back and try again.</p>
              <Button variant="outline" onClick={handleBackFromReport} className="mt-4">
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <CertifiedPayrollReportPreview
        data={reportData}
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
              onNext={handleNext}
              onBack={handleBack}
              onAddPayrollData={handleAddPayrollData}
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