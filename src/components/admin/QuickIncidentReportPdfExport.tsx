"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { getProjectLocation } from '@/lib/utils/project-location';

interface QuickIncidentReportFormData {
  completedBy: string;
  reportDate: string;
  projectName: string;
  injuredPerson: string;
  signature: string;
  reporterFullName: string;
  reporterDate: string;
  photos?: File[];
  uploadedFiles?: { filename: string; url: string }[];
  
  // Additional fields from screenshot layout
  companySubcontractor?: string;
  projectLocation?: string;
  reviewedBy?: string;
  followUpActionsTaken?: string;
  
  // Admin section fields
  adminReportReviewedBy?: string;
  adminReviewDate?: string;
  adminFollowUpAction?: string;
  status?: string;
}

interface QuickIncidentReportPdfExportProps {
  formData: QuickIncidentReportFormData;
  fileName?: string;
}

// React PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  fieldRowTwoColumn: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 15,
  },
  fieldColumn: {
    flex: 1,
    flexDirection: 'row',
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: '35%',
  },
  fieldValue: {
    flex: 1,
    borderBottom: '1px solid #000',
    paddingBottom: 2,
  },
  fieldRowSingle: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fieldLabelSingle: {
    fontWeight: 'bold',
    width: '25%',
  },
  fieldValueSingle: {
    flex: 1,
    borderBottom: '1px solid #000',
    paddingBottom: 2,
  },
  signatureSection: {
    marginTop: 25,
  },
  signatureHeader: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  signatureBox: {
    border: '1px solid #000',
    padding: 8,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  signatureImage: {
    width: 148,
    height: 56,
    alignSelf: 'center',
  },
  reviewSection: {
    marginTop: 20,
  },
  reviewText: {
    marginBottom: 10,
    fontSize: 11,
  },
  followUpSection: {
    marginTop: 15,
  },
  followUpHeader: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  followUpBox: {
    border: '1px solid #000',
    padding: 8,
    minHeight: 80,
    fontSize: 9,
  },
});

// React PDF Document Component
const QuickIncidentReportPDFDocument: React.FC<{ formData: QuickIncidentReportFormData; projectLocation?: string }> = ({ formData, projectLocation }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Incident Report</Text>
        
        {/* Basic Information - Two Column Layout */}
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Project Name:</Text>
            <Text style={styles.fieldValue}>{formData.projectName || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Date:</Text>
            <Text style={styles.fieldValue}>{formData.reportDate || ''}</Text>
          </View>
        </View>
        
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Sub Name:</Text>
            <Text style={styles.fieldValue}>{formData.companySubcontractor || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Injured Person:</Text>
            <Text style={styles.fieldValue}>{formData.injuredPerson || ''}</Text>
          </View>
        </View>

        {/* Project Location - Single Row */}
        <View style={styles.fieldRowSingle}>
          <Text style={styles.fieldLabelSingle}>Project Location:</Text>
          <Text style={styles.fieldValueSingle}>{projectLocation || formData.projectLocation || ''}</Text>
        </View>

        {/* Completed By - Single Row */}
        <View style={styles.fieldRowSingle}>
          <Text style={styles.fieldLabelSingle}>Completed By:</Text>
          <Text style={styles.fieldValueSingle}>{formData.completedBy || ''}</Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureHeader}>
            <Text>Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            {formData.signature && 
             (formData.signature.startsWith('data:image/') || formData.signature.startsWith('http')) ? (
              <Image style={styles.signatureImage} src={formData.signature} />
            ) : (
              <Text>Signature</Text>
            )}
          </View>
        </View>

        {/* Reviewed By Section */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewText}>
            Reviewed By: {formData.adminReportReviewedBy || formData.reviewedBy || formData.reporterFullName || ''}
          </Text>
        </View>

        {/* Follow Up Actions Section */}
        <View style={styles.followUpSection}>
          <View style={styles.followUpHeader}>
            <Text>Follow Up Actions Taken</Text>
          </View>
          <View style={styles.followUpBox}>
            <Text>{formData.adminFollowUpAction || formData.followUpActionsTaken || ''}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Main Export Component
const QuickIncidentReportPdfExport: React.FC<QuickIncidentReportPdfExportProps> = ({ 
  formData, 
  fileName = "quick-incident-report.pdf" 
}) => {
  const [projectLocation, setProjectLocation] = useState<string>('')

  useEffect(() => {
    const fetchProjectLocation = async () => {
      if (formData.projectName) {
        const location = await getProjectLocation(formData.projectName)
        setProjectLocation(location)
      }
    }
    fetchProjectLocation()
  }, [formData.projectName])

  return (
    <div className="flex gap-2">
      <PDFDownloadLink
        document={<QuickIncidentReportPDFDocument formData={formData} projectLocation={projectLocation} />}
        fileName={fileName}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
      >
        {({ blob, url, loading, error }) => (
          loading ? (
            <>
              <FileText className="h-4 w-4" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF
            </>
          )
        )}
      </PDFDownloadLink>
    </div>
  );
};

// Direct PDF generation function
export const generateAndDownloadQuickIncidentReportPDF = async (formData: QuickIncidentReportFormData, fileName: string) => {
  try {
    const projectLocation = formData.projectName ? await getProjectLocation(formData.projectName) : ''
    const doc = <QuickIncidentReportPDFDocument formData={formData} projectLocation={projectLocation} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Quick Incident Report PDF:', error);
    throw error;
  }
};

export default QuickIncidentReportPdfExport;