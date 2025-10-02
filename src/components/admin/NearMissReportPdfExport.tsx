"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { getProjectLocation } from '@/lib/utils/project-location';

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
  
  // Step 1: Type and Cause
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
  evidenceFiles?: File[];
  uploadedFiles?: { filename: string; url: string }[];
  
  // Step 6: Acknowledgement
  reporterSignature: string;
  reporterDate: string;
  supervisorSignature: string;
  supervisorDate: string;
}

interface NearMissReportPdfExportProps {
  formData: NearMissFormData;
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
    marginBottom: 15,
    fontWeight: 'bold',
  },
  fieldRowTwoColumn: {
    flexDirection: 'row',
    marginBottom: 6,
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
  sectionHeader: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  textAreaBox: {
    border: '1px solid #000',
    padding: 8,
    minHeight: 50,
    marginBottom: 8,
    fontSize: 9,
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  checkbox: {
    width: 10,
    height: 10,
    marginRight: 8,
    border: '1px solid #000',
  },
  checkedBox: {
    backgroundColor: '#000',
  },
  checkboxLabel: {
    fontSize: 10,
  },
  signatureSection: {
    marginTop: 15,
  },
  signatureHeader: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  signatureRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 20,
  },
  signatureColumn: {
    flex: 1,
  },
  signatureWithDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
    gap: 20,
  },
  signatureBox: {
    border: '1px solid #000',
    padding: 8,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  signatureImage: {
    width: 120,
    height: 45,
    alignSelf: 'center',
  },
  signatureLabelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  signatureLabel: {
    fontWeight: 'bold',
    width: '30%',
  },
  signatureBoxInline: {
    border: '1px solid #000',
    padding: 8,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
  },
  dateSection: {
    flex: 1,
    flexDirection: 'column',
  },
  dateContainer: {
    borderBottom: '1px solid #000',
    height: 25,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  dateText: {
    fontSize: 10,
  },
});

// React PDF Document Component
const NearMissReportPDFDocument: React.FC<{ formData: NearMissFormData; projectLocation?: string }> = ({ formData, projectLocation }) => {
  // Helper function to render checkboxes for yes/no fields
  const renderYesNoCheckbox = (value: string, label: string) => (
    <View style={styles.checkboxRow}>
      <View style={[styles.checkbox, ...(value === 'yes' ? [styles.checkedBox] : [])]} />
      <Text style={styles.checkboxLabel}>Employee Almost Injured</Text>
      <View style={[styles.checkbox, ...(value === 'no' ? [styles.checkedBox] : [])]} />
      <Text style={styles.checkboxLabel}>Safety Procedures Violated</Text>
    </View>
  );

  // Helper function to render PPE checkbox
  const renderPPECheckbox = (value: string) => (
    <View style={styles.checkboxRow}>
      <View style={[styles.checkbox, ...(value === 'yes' ? [styles.checkedBox] : [])]} />
      <Text style={styles.checkboxLabel}>PPE Being Worn</Text>
    </View>
  );

  return (
    <Document>
      {/* Page 1: General Information + Near Miss Details */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Near Miss Report</Text>
        
        {/* Basic Information - Two Column Layout */}
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Project Name:</Text>
            <Text style={styles.fieldValue}>{formData.projectName || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Date of Near Miss:</Text>
            <Text style={styles.fieldValue}>{formData.dateTimeOfNearMiss || ''}</Text>
          </View>
        </View>
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Sub Name:</Text>
            <Text style={styles.fieldValue}>{formData.companySubcontractor || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Date Management Notified:</Text>
            <Text style={styles.fieldValue}>{formData.dateTimeManagementNotified || ''}</Text>
          </View>
        </View>
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Project Location:</Text>
            <Text style={styles.fieldValue}>{projectLocation || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Supervisor:</Text>
            <Text style={styles.fieldValue}>{formData.supervisor || ''}</Text>
          </View>
        </View>
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Reported By:</Text>
            <Text style={styles.fieldValue}>{formData.reportedBy || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Safety Representative:</Text>
            <Text style={styles.fieldValue}>{formData.safetyRepresentative || ''}</Text>
          </View>
        </View>

        {/* Witness Details Section */}
        <View style={styles.sectionHeader}>
          <Text>Witness Details</Text>
        </View>
        
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Person Notified:</Text>
            <Text style={styles.fieldValue}>{formData.whoWasNotified || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            {/* Empty column */}
          </View>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 15 }]}>Witnesses and Contact Information:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.witnessesContactInfo || ''}</Text>
        </View>

        <View style={[styles.fieldRowTwoColumn, { marginTop: 15 }]}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Type of Incident:</Text>
            <Text style={styles.fieldValue}>{formData.typeOfIncident || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Cause of Incident:</Text>
            <Text style={styles.fieldValue}>{formData.causeOfIncident || ''}</Text>
          </View>
        </View>

        {/* Near Miss Details Section */}
        <View style={styles.sectionHeader}>
          <Text>Near Miss Details</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Task Being Performed:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.taskBeingPerformed || ''}</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>What Almost Happened:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.whatAlmostHappened || ''}</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Potential Consequences:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.potentialConsequences || ''}</Text>
        </View>
      </Page>

      {/* Page 2: Contributing Factors + Corrective Actions */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Near Miss Report</Text>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Non-Employed Workers on Site:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.anyoneNotEmployed || ''}</Text>
        </View>

        {/* Checkboxes for Employee Almost Injured and Safety Procedures Violated */}
        <View style={styles.checkboxRow}>
          <View style={[styles.checkbox, ...(formData.wasAnyoneAlmostInjured === 'yes' ? [styles.checkedBox] : [])]} />
          <Text style={[styles.checkboxLabel, { marginRight: 30 }]}>Employee Almost Injured</Text>
          <View style={[styles.checkbox, ...(formData.wereSafetyProceduresViolated === 'yes' ? [styles.checkedBox] : [])]} />
          <Text style={styles.checkboxLabel}>Safety Procedures Violated</Text>
        </View>

        {/* Contributing Factors Section */}
        <View style={styles.sectionHeader}>
          <Text>Contributing Factors</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Equipment / Materials Involved:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.equipmentMaterialsInvolved || ''}</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Unsafe Behavior / Condition:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.unsafeBehaviorCondition || ''}</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Weather / Environment Issues:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.weatherEnvironmentIssues || ''}</Text>
        </View>

        {/* PPE Checkbox */}
        <View style={styles.checkboxRow}>
          <View style={[styles.checkbox, ...(formData.wasPPEBeingWorn === 'yes' ? [styles.checkedBox] : [])]} />
          <Text style={styles.checkboxLabel}>PPE Being Worn</Text>
        </View>

        {/* Corrective Actions Section */}
        <View style={styles.sectionHeader}>
          <Text>Corrective Actions</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Actions taken:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.actionsTaken || ''}</Text>
        </View>

        <Text style={[styles.fieldLabel, { marginBottom: 5, marginTop: 5 }]}>Prevention Recommendations:</Text>
        <View style={styles.textAreaBox}>
          <Text>{formData.preventionRecommendations || ''}</Text>
        </View>
      </Page>

      {/* Page 3: Reporter Acknowledgement */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Near Miss Report</Text>

        {/* Reporter Acknowledgement Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureHeader}>
            <Text>Reporter Acknowledgement</Text>
          </View>

          <Text style={[styles.signatureLabel, { marginBottom: 5, marginTop: 8 }]}>Signature:</Text>
          <View style={styles.signatureWithDateRow}>
            <View style={styles.signatureBoxInline}>
              {formData.reporterSignature && 
               (formData.reporterSignature.startsWith('data:image/') || formData.reporterSignature.startsWith('http')) ? (
                <Image style={styles.signatureImage} src={formData.reporterSignature} />
              ) : (
                <Text>Signature</Text>
              )}
            </View>
            <View style={styles.dateSection}>
              <Text style={[styles.signatureLabel, { marginBottom: 5 }]}>Date:</Text>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{formData.reporterDate || ''}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.signatureLabel, { marginBottom: 5, marginTop: 8 }]}>Supervisor Signature:</Text>
          <View style={styles.signatureWithDateRow}>
            <View style={styles.signatureBoxInline}>
              {formData.supervisorSignature && 
               (formData.supervisorSignature.startsWith('data:image/') || formData.supervisorSignature.startsWith('http')) ? (
                <Image style={styles.signatureImage} src={formData.supervisorSignature} />
              ) : (
                <Text>Signature</Text>
              )}
            </View>
            <View style={styles.dateSection}>
              <Text style={[styles.signatureLabel, { marginBottom: 5 }]}>Date:</Text>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{formData.supervisorDate || ''}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Main Export Component
const NearMissReportPdfExport: React.FC<NearMissReportPdfExportProps> = ({ 
  formData, 
  fileName = "near-miss-report.pdf" 
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
        document={<NearMissReportPDFDocument formData={formData} projectLocation={projectLocation} />}
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
export const generateAndDownloadNearMissReportPDF = async (formData: NearMissFormData, fileName: string) => {
  try {
    const projectLocation = formData.projectName ? await getProjectLocation(formData.projectName) : ''
    const doc = <NearMissReportPDFDocument formData={formData} projectLocation={projectLocation} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Near Miss Report PDF:', error);
    throw error;
  }
};

export default NearMissReportPdfExport;