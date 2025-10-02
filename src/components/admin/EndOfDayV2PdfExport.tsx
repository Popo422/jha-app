"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { getProjectLocation } from '@/lib/utils/project-location';

interface FieldEmployee {
  id: string;
  name: string;
  working: boolean;
  hoursWorked: number;
  statusAtLunch: 'free-of-injury' | 'injured';
  statusAtEndOfDay: 'free-of-injury' | 'injured';
  signature: string;
}

interface EndOfDayV2FormData {
  // Step 1: Select Subcontractor
  subcontractorName: string;
  date: string;
  
  // Step 2: Project Details
  completedBy: string;
  supervisor: string;
  projectName: string;
  projectLocation?: string;
  
  // Step 3: Field Employees
  fieldEmployees: FieldEmployee[];
  
  // Step 4: End of Shift Review
  nearMissesIncidents: string;
  cleanupConfirmation: string;
  performDifferently: string;
  additionalEquipment: string;
  supervisorSignature: string;
  supervisorName: string;
}

interface EndOfDayV2PdfExportProps {
  formData: EndOfDayV2FormData;
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
  subtitle: {
    fontSize: 12,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: '30%',
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
    marginBottom: 0,
  },
  employeesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 5,
  },
  textAreaBox: {
    border: '1px solid #000',
    padding: 10,
    minHeight: 60,
    marginBottom: 0,
    fontSize: 9,
  },
  employeeTable: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  tableHeaderCell: {
    color: '#fff',
    border: '1px solid #000',
    padding: 5,
    textAlign: 'center',
    fontSize: 9,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    border: '1px solid #000',
    padding: 5,
    textAlign: 'center',
    fontSize: 8,
    flex: 1,
  },
  signatureCell: {
    border: '1px solid #000',
    padding: 5,
    textAlign: 'center',
    fontSize: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureImage: {
    maxWidth: 88,
    maxHeight: 33,
    alignSelf: 'center',
  },
  foremanRow: {
    flexDirection: 'row',
    marginTop: 30,
    marginBottom: 10,
  },
  foremanLabel: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  foremanName: {
    fontSize: 11,
    marginLeft: 5,
  },
  signatureSection: {
    marginTop: 10,
  },
  signatureBox: {
    border: '1px solid #000',
    padding: 10,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foremanSignatureImage: {
    width: 148,
    height: 56,
    alignSelf: 'center',
  },
});

// React PDF Document Component
const EndOfDayV2PDFDocument: React.FC<{ formData: EndOfDayV2FormData; projectLocation?: string }> = ({ formData, projectLocation }) => {
  const renderEmployeeTable = () => {
    if (!formData.fieldEmployees || formData.fieldEmployees.length === 0) {
      return <Text>No field employees recorded.</Text>;
    }

    return (
      <View style={styles.employeeTable}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Field Employee</Text>
          <Text style={styles.tableHeaderCell}>Hours Worked</Text>
          <Text style={styles.tableHeaderCell}>Status at Lunch</Text>
          <Text style={styles.tableHeaderCell}>Status at End of Day</Text>
          <Text style={styles.tableHeaderCell}>Signature</Text>
        </View>
        {formData.fieldEmployees.map((employee, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>{employee.name || ''}</Text>
            <Text style={styles.tableCell}>{employee.hoursWorked || ''}</Text>
            <Text style={styles.tableCell}>{employee.statusAtLunch === 'free-of-injury' ? 'Free of Injury' : 'Injured'}</Text>
            <Text style={styles.tableCell}>{employee.statusAtEndOfDay === 'free-of-injury' ? 'Free of Injury' : 'Injured'}</Text>
            <View style={styles.signatureCell}>
              {employee.signature && (employee.signature.startsWith('data:image/') || employee.signature.startsWith('http')) ? (
                <Image style={styles.signatureImage} src={employee.signature} />
              ) : (
                <Text>Signature</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Document>
      {/* Page 1: Basic Info + Review Sections */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>End of Day Report</Text>
        
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Project Name:</Text>
          <Text style={styles.fieldValue}>{formData.projectName || ''}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date:</Text>
          <Text style={styles.fieldValue}>{formData.date || ''}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Sub Name:</Text>
          <Text style={styles.fieldValue}>{formData.subcontractorName || ''}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Supervisor:</Text>
          <Text style={styles.fieldValue}>{formData.supervisor || ''}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Project Location:</Text>
          <Text style={styles.fieldValue}>{projectLocation || formData.projectLocation || ''}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Foreman:</Text>
          <Text style={styles.fieldValue}>{formData.completedBy || ''}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text>Near Misses / Incidents / Issues requiring re-work</Text>
        </View>
        <View style={styles.textAreaBox}>
          <Text>{formData.nearMissesIncidents || ''}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text>Work Area / Tools / Equipment Clean Up Process</Text>
        </View>
        <View style={styles.textAreaBox}>
          <Text>{formData.cleanupConfirmation || ''}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text>Areas For Improvement</Text>
        </View>
        <View style={styles.textAreaBox}>
          <Text>{formData.performDifferently || ''}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text>Equipment / Tools / Training / Support Required Tomorrow</Text>
        </View>
        <View style={styles.textAreaBox}>
          <Text>{formData.additionalEquipment || ''}</Text>
        </View>
      </Page>

      {/* Page 2: Field Employees + Signature */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>End of Day Report</Text>
        
        <Text style={styles.employeesLabel}>Field Employees:</Text>
        {renderEmployeeTable()}

        <View style={styles.foremanRow}>
          <Text style={styles.foremanLabel}>Foreman:</Text>
          <Text style={styles.foremanName}>{formData.supervisorName || formData.completedBy || ''}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text>Foreman Signature:</Text>
        </View>
        <View style={styles.signatureBox}>
          {formData.supervisorSignature && (formData.supervisorSignature.startsWith('data:image/') || formData.supervisorSignature.startsWith('http')) ? (
            <Image style={styles.foremanSignatureImage} src={formData.supervisorSignature} />
          ) : (
            <Text>Signature</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

// Main Export Component
const EndOfDayV2PdfExport: React.FC<EndOfDayV2PdfExportProps> = ({ 
  formData, 
  fileName = "end-of-day-v2-report.pdf" 
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
        document={<EndOfDayV2PDFDocument formData={formData} projectLocation={projectLocation} />}
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
export const generateAndDownloadEndOfDayV2PDF = async (formData: EndOfDayV2FormData, fileName: string) => {
  try {
    const projectLocation = formData.projectName ? await getProjectLocation(formData.projectName) : ''
    const doc = <EndOfDayV2PDFDocument formData={formData} projectLocation={projectLocation} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating End of Day V2 PDF:', error);
    throw error;
  }
};

export default EndOfDayV2PdfExport;