"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { formatDateForPDF } from '@/lib/utils/date-formatting';

interface FieldEmployee {
  id: string;
  name: string;
  working: boolean;
  startTime: string;
  status: 'free-of-injury' | 'injured';
  signature: string;
}

interface SafetySection {
  [key: string]: boolean;
}

interface SafetySectionWithCustom {
  selected: SafetySection;
  customItems: string[];
}

interface StartOfDayV2FormData {
  // Basic Information
  subcontractorName?: string;
  projectName?: string;
  date?: string;
  supervisor?: string;
  completedBy?: string;
  
  // Safety Information
  additionalPPE?: SafetySectionWithCustom;
  focus6?: SafetySectionWithCustom;
  impacts?: SafetySectionWithCustom;
  permits?: SafetySectionWithCustom;
  equipmentInspections?: SafetySectionWithCustom;
  
  // Safety Protocol Steps
  listTheSteps?: string[];
  identifyHazards?: string[];
  protectionMethods?: string[];
  
  // Field employees
  fieldEmployees?: FieldEmployee[];
}

interface StartOfDayV2PdfExportProps {
  formData: StartOfDayV2FormData;
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
  safetyGrid: {
    marginVertical: 20,
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  gridHeaderCell: {
    color: '#fff',
    padding: 8,
    textAlign: 'center',
    fontSize: 9,
    border: '1px solid #000',
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    padding: 4,
    border: '1px solid #ccc',
    textAlign: 'center',
    fontSize: 8,
    flex: 1,
    minHeight: 25,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 10,
    height: 10,
    marginRight: 5,
    border: '1px solid #000',
  },
  checkedBox: {
    backgroundColor: '#000',
  },
  stepSection: {
    marginVertical: 20,
  },
  stepHeader: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepContent: {
    marginTop: 10,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  stepNumber: {
    fontWeight: 'bold',
    width: 20,
  },
  stepText: {
    flex: 1,
    borderBottom: '1px solid #000',
    paddingBottom: 2,
  },
  employeeTable: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  tableHeaderCell: {
    color: '#fff',
    border: '1px solid #fff',
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
  signatureImage: {
    maxWidth: 88,
    maxHeight: 33,
    alignSelf: 'center',
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
});

// Safety options configuration - maps form fields to display labels
const safetyOptionsMap = {
  additionalPPE: {
    title: 'Additional PPE',
    options: {
      respirator: 'Respirator',
      faceProtection: 'Face Protection', 
      hearingProtection: 'Hearing Protection',
      safetyGloves: 'Safety Gloves'
    }
  },
  focus6: {
    title: 'Focus 6',
    options: {
      falls: 'Falls',
      electrocution: 'Electrocution',
      evacuation: 'Evacuation',
      craneLIfting: 'Crane / Lifting',
      caughtInBetween: 'Caught-in or Between',
      struckBy: 'Struck By'
    }
  },
  impacts: {
    title: 'Impacts',
    options: {
      weather: 'Weather',
      environment: 'Environment',
      public: 'Public',
      traffic: 'Traffic'
    }
  },
  permits: {
    title: 'Permits',
    options: {
      hotWork: 'Hot Work',
      confinedSpace: 'Confined Space',
      evacuation: 'Evacuation',
      criticalLift: 'Critical Lift',
      lockoutTagout: 'Lockout Tagout'
    }
  },
  equipmentInspections: {
    title: 'Equipment Inspections',
    options: {
      fallProtection: 'Fall Protection',
      rigging: 'Rigging',
      scaffoldShoring: 'Scaffold / Shoring',
      extensionLadder: 'Extension Ladder',
      forklift: 'Forklift',
      stepLadder: 'Step Ladder'
    }
  }
};

// React PDF Document Component
const StartOfDayV2PDFDocument: React.FC<{ formData: StartOfDayV2FormData }> = ({ formData }) => {
  const renderCheckboxGrid = () => {
    const categories = Object.entries(safetyOptionsMap);
    const maxOptions = Math.max(...categories.map(([_, category]) => Object.keys(category.options).length));
    const rows = [];
    
    // Header row
    const headerCells = categories.map(([_, category]) => (
      <Text key={category.title} style={styles.gridHeaderCell}>{category.title}</Text>
    ));
    
    // Data rows
    for (let row = 0; row < maxOptions; row++) {
      const cells = categories.map(([categoryKey, category]) => {
        const optionKeys = Object.keys(category.options);
        const optionKey = optionKeys[row];
        
        if (optionKey) {
          const optionLabel = (category.options as any)[optionKey];
          const safetySection = formData[categoryKey as keyof StartOfDayV2FormData] as SafetySectionWithCustom;
          const isChecked = safetySection?.selected?.[optionKey] || false;
          
          return (
            <View key={`${categoryKey}-${row}`} style={styles.gridCell}>
              <View style={styles.checkboxContainer}>
                <View style={[styles.checkbox, ...(isChecked ? [styles.checkedBox] : [])]} />
                <Text>{optionLabel}</Text>
              </View>
            </View>
          );
        } else {
          return <View key={`${categoryKey}-${row}`} style={styles.gridCell} />;
        }
      });
      
      rows.push(
        <View key={row} style={styles.gridRow}>
          {cells}
        </View>
      );
    }
    
    return (
      <View style={styles.safetyGrid}>
        <View style={styles.gridHeader}>
          {headerCells}
        </View>
        {rows}
      </View>
    );
  };

  const renderNumberedSection = (title: string, items: string[] = []) => (
    <View style={styles.stepSection}>
      <View style={styles.stepHeader}>
        <Text>{title}</Text>
      </View>
      <View style={styles.stepContent}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.stepItem}>
            <Text style={styles.stepNumber}>{index + 1}:</Text>
            <Text style={styles.stepText}>{items[index] || ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderEmployeeTable = () => {
    if (!formData.fieldEmployees || formData.fieldEmployees.length === 0) {
      return <Text>No field employees recorded.</Text>;
    }

    return (
      <View style={styles.employeeTable}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Field Employee</Text>
          <Text style={styles.tableHeaderCell}>Start Time</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={styles.tableHeaderCell}>Signature</Text>
        </View>
        {formData.fieldEmployees.map((employee, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>{employee.name || ''}</Text>
            <Text style={styles.tableCell}>{employee.startTime || ''}</Text>
            <Text style={styles.tableCell}>{employee.status || ''}</Text>
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
      {/* Page 1: Basic Info + Safety Grid + Step 1 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Start of Day Report</Text>
        
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Project Name:</Text>
          <Text style={styles.fieldValue}>{formData.projectName || ''}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date:</Text>
          <Text style={styles.fieldValue}>{formatDateForPDF(formData.date)}</Text>
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
          <Text style={styles.fieldLabel}>Completed By:</Text>
          <Text style={styles.fieldValue}>{formData.completedBy || ''}</Text>
        </View>

        {renderCheckboxGrid()}

        {renderNumberedSection('Step 1 - List The Steps', formData.listTheSteps)}
      </Page>

      {/* Page 2: Steps 2 & 3 */}
      <Page size="A4" style={styles.page}>
        {renderNumberedSection('Step 2 - Identify The Safety Hazards', formData.identifyHazards)}
        {renderNumberedSection('Step 3 - Methods To Protect Our People', formData.protectionMethods)}
      </Page>

      {/* Page 3: Employee Table */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Start of Day Report</Text>
        <Text style={styles.subtitle}>Field Employees:</Text>
        {renderEmployeeTable()}
      </Page>
    </Document>
  );
};

// Main Export Component
const StartOfDayV2PdfExport: React.FC<StartOfDayV2PdfExportProps> = ({ 
  formData, 
  fileName = "start-of-day-v2-report.pdf" 
}) => {
  return (
    <div className="flex gap-2">
      <PDFDownloadLink
        document={<StartOfDayV2PDFDocument formData={formData} />}
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
export const generateAndDownloadPDF = async (formData: StartOfDayV2FormData, fileName: string) => {
  try {
    const doc = <StartOfDayV2PDFDocument formData={formData} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default StartOfDayV2PdfExport;