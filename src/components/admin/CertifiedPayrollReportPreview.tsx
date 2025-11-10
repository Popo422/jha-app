"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ArrowLeft, FileText } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import CertifiedPayrollReportWizard, { PayrollPDFDocument } from './CertifiedPayrollReportWizard';

interface PayrollReportData {
  weekStart: string;
  weekEnd: string;
  projectName: string;
  workers: any[];
}

interface CertifiedPayrollReportPreviewProps {
  data: PayrollReportData;
  onBack: () => void;
}

export default function CertifiedPayrollReportPreview({ data, onBack }: CertifiedPayrollReportPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Generate PDF blob
      const blob = await pdf(<PayrollPDFDocument data={data} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certified_Payroll_${data.weekStart.replace(/-/g, '')}_to_${data.weekEnd.replace(/-/g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const formatDateRange = () => {
    const start = new Date(data.weekStart);
    const end = new Date(data.weekEnd);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with controls */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Wizard
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Certified Payroll Preview
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Week of {formatDateRange()} • {data.workers.length} workers
                </p>
              </div>
            </div>
            <Button 
              onClick={handleDownload}
              disabled={downloading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* PDF Preview */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-0">
          <CertifiedPayrollReportWizard 
            data={data} 
            isLoading={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}