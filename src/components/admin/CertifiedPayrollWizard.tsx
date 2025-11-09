"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Calendar } from "lucide-react";

interface CertifiedPayrollWizardProps {
  projectId: string;
}

type WizardStep = "select-workmen" | "select-timeframe" | "add-details";

export default function CertifiedPayrollWizard({ projectId }: CertifiedPayrollWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-workmen");

  const handleNext = () => {
    if (currentStep === "select-workmen") {
      setCurrentStep("select-timeframe");
    } else if (currentStep === "select-timeframe") {
      setCurrentStep("add-details");
    } else {
      // Navigate back to project dashboard with the Time & Cost tab
      router.push(`/admin/project-dashboard/${projectId}?tab=time-cost`);
    }
  };

  const handleGoBack = () => {
    router.push(`/admin/project-dashboard/${projectId}?tab=time-cost`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Go Back button outside the widget */}
      <Button 
        variant="ghost" 
        onClick={handleGoBack}
        className="text-blue-600 hover:text-blue-700"
      >
        Go Back
      </Button>

      {/* Main wizard content in a card/widget */}
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
                  currentStep === "select-workmen" 
                    ? "bg-cyan-100 dark:bg-cyan-900" 
                    : "bg-gray-100 dark:bg-gray-900"
                }`}>
                  <Users className={`w-6 h-6 ${
                    currentStep === "select-workmen"
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-gray-400"
                  }`} />
                </div>
                <h3 className={`font-semibold ${
                  currentStep === "select-workmen" 
                    ? "text-gray-900 dark:text-gray-100" 
                    : "text-gray-600 dark:text-gray-400"
                }`}>Select Workmen</h3>
                <p className="text-sm text-muted-foreground">Select the employees to add to this certified payroll.</p>
              </div>

              <div className="text-center space-y-3">
                <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center ${
                  currentStep === "select-timeframe" 
                    ? "bg-cyan-100 dark:bg-cyan-900" 
                    : "bg-blue-50 dark:bg-blue-900/20"
                }`}>
                  <Calendar className={`w-6 h-6 ${
                    currentStep === "select-timeframe"
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-blue-500 dark:text-blue-400"
                  }`} />
                </div>
                <h3 className={`font-semibold ${
                  currentStep === "select-timeframe" 
                    ? "text-gray-900 dark:text-gray-100" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>Select Time Frame</h3>
                <p className="text-sm text-muted-foreground">Select the time frame this certified payroll report is for.</p>
              </div>

              <div className="text-center space-y-3">
                <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center ${
                  currentStep === "add-details" 
                    ? "bg-cyan-100 dark:bg-cyan-900" 
                    : "bg-green-50 dark:bg-green-900/20"
                }`}>
                  <FileText className={`w-6 h-6 ${
                    currentStep === "add-details"
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-green-600 dark:text-green-400"
                  }`} />
                </div>
                <h3 className={`font-semibold ${
                  currentStep === "add-details" 
                    ? "text-gray-900 dark:text-gray-100" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>Add Payroll Details</h3>
                <p className="text-sm text-muted-foreground">Add payroll information using a form or upload your payroll report.</p>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button 
                onClick={handleNext}
                className="bg-black hover:bg-gray-800 text-white px-8 py-2 rounded-md"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}