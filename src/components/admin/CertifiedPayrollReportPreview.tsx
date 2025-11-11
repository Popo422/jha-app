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
  weeks?: any[];
}

interface CertifiedPayrollReportPreviewProps {
  generateReportData: () => Promise<PayrollReportData | null>;
  isCalculating: boolean;
  onBack: () => void;
}

export default function CertifiedPayrollReportPreview({ generateReportData, isCalculating, onBack }: CertifiedPayrollReportPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState<PayrollReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await generateReportData();
        if (reportData) {
          setData(reportData);
        } else {
          setError('Failed to generate report data');
        }
      } catch (err) {
        console.error('Error loading report data:', err);
        setError('Error generating report data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array to run only once

  const handleDownload = async () => {
    if (!data) return;
    
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
    if (!data) return '';
    
    const start = new Date(data.weekStart);
    const end = new Date(data.weekEnd);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  // Show loading state
  if (loading || isCalculating) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Calculating payroll data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error || !data) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Failed to generate report data'}</p>
            <Button variant="outline" onClick={onBack}>
              Back to Wizard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const workerCount = data.weeks ? 
    // Count unique workers across all weeks
    new Set(data.weeks.flatMap(week => week.workers.map((worker: any) => worker.id))).size : 
    data.workers.length;

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
                  {formatDateRange()} • {workerCount} worker entries • {data.weeks ? `${data.weeks.length} weeks` : '1 week'}
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