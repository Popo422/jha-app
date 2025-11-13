"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Upload, ArrowLeft } from 'lucide-react';

interface PayrollDataWizardProps {
  contractorName: string;
  contractorId: string;
  dateRange: { startDate: string; endDate: string };
  onBack: () => void;
  onAddManually: () => void;
  onUploadPdf: () => void;
}

export default function PayrollDataWizard({ 
  contractorName,
  contractorId,
  dateRange,
  onBack,
  onAddManually,
  onUploadPdf
}: PayrollDataWizardProps) {
  
  const formatDateRange = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payroll Details
          </Button>

          {/* Main wizard content */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardContent className="p-12">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
                    Add or Upload your Payroll
                  </h1>
                  <div className="space-y-2">
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      Add payroll information using the upload form or upload using a payroll report.
                    </p>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium">Employee: {contractorName}</p>
                      <p>Pay Period: {formatDateRange()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Add Manually Option */}
                  <div className="relative group">
                    <Card className="h-full border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer">
                      <CardContent className="p-8 text-center space-y-6 h-full flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                            <Plus className="w-8 h-8 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Add Manually
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Enter payroll information manually using our step-by-step form with hours, rates, and deductions.
                          </p>
                        </div>
                        <Button 
                          onClick={onAddManually}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Manually
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upload PDF Option */}
                  <div className="relative group">
                    <Card className="h-full border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
                      <CardContent className="p-8 text-center space-y-6 h-full flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Upload using a PDF
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Upload an existing payroll report (PDF format) and let our AI extract the payroll information automatically.
                          </p>
                        </div>
                        <Button 
                          onClick={onUploadPdf}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload PDF
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose the option that works best for your workflow
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}