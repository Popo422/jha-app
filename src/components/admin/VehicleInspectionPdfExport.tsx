"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';

interface VehicleInspectionFormData {
  // General Information
  completedBy: string;
  date: string;
  supervisor: string;
  projectName: string;
  company: string;
  
  // Equipment Info
  equipmentType: string;
  unitNumber: string;
  
  // Inspection Points
  headlights: string;
  headlightsComment: string;
  tailLights: string;
  tailLightsComment: string;
  turnIndicatorLights: string;
  turnIndicatorLightsComment: string;
  stopLights: string;
  stopLightsComment: string;
  brakes: string;
  brakesComment: string;
  emergencyParkingBrake: string;
  emergencyParkingBrakeComment: string;
  steeringMechanism: string;
  steeringMechanismComment: string;
  ballJoints: string;
  ballJointsComment: string;
  tieRods: string;
  tieRodsComment: string;
  rackPinion: string;
  rackPinionComment: string;
  bushings: string;
  bushingsComment: string;
  windshield: string;
  windshieldComment: string;
  rearWindowOtherGlass: string;
  rearWindowOtherGlassComment: string;
  windshieldWipers: string;
  windshieldWipersComment: string;
  frontSeatAdjustment: string;
  frontSeatAdjustmentComment: string;
  doors: string;
  doorsComment: string;
  horn: string;
  hornComment: string;
  speedometer: string;
  speedometerComment: string;
  bumpers: string;
  bumpersComment: string;
  mufflerExhaustSystem: string;
  mufflerExhaustSystemComment: string;
  tires: string;
  tiresComment: string;
  rearViewMirrors: string;
  rearViewMirrorsComment: string;
  safetyBelts: string;
  safetyBeltsComment: string;
  
  // Additional
  additionalPhotos?: File[];
  uploadedFiles?: { filename: string; url: string }[];
  signature: string;
}

interface VehicleInspectionPdfExportProps {
  formData: VehicleInspectionFormData;
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
    marginBottom: 12,
    fontWeight: 'bold',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldRowTwoColumn: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 15,
  },
  fieldColumn: {
    flex: 1,
    flexDirection: 'row',
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: '30%',
  },
  fieldLabelTwoColumn: {
    fontWeight: 'bold',
    width: '35%',
  },
  fieldValue: {
    flex: 1,
    borderBottom: '1px solid #000',
    paddingBottom: 2,
  },
  inspectionTable: {
    marginTop: 15,
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  tableHeaderCell: {
    color: '#fff',
    border: '1px solid #000',
    padding: 8,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    border: '1px solid #000',
    padding: 5,
    textAlign: 'center',
    fontSize: 9,
    flex: 1,
    minHeight: 30,
  },
  tableCellLeft: {
    border: '1px solid #000',
    padding: 5,
    fontSize: 9,
    flex: 1,
    minHeight: 30,
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
  signatureBox: {
    border: '1px solid #000',
    padding: 8,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureImage: {
    width: 148,
    height: 56,
    alignSelf: 'center',
  },
});

// Inspection items configuration
const INSPECTION_ITEMS = [
  { key: 'headlights', label: 'Headlights' },
  { key: 'tailLights', label: 'Tail Lights' },
  { key: 'turnIndicatorLights', label: 'Turn Indicator Lights' },
  { key: 'stopLights', label: 'Stop Lights' },
  { key: 'brakes', label: 'Brakes' },
  { key: 'emergencyParkingBrake', label: 'Emergency / Parking Brake' },
  { key: 'steeringMechanism', label: 'Steering Mechanism' },
  { key: 'ballJoints', label: 'Ball Joints' },
  { key: 'tieRods', label: 'Tie Rods' },
  { key: 'rackPinion', label: 'Rack & Pinion' },
  { key: 'bushings', label: 'Bushings' },
  { key: 'windshield', label: 'Windshield' },
  { key: 'rearWindowOtherGlass', label: 'Rear Window & Other Glass' },
  { key: 'windshieldWipers', label: 'Windshield Wipers' },
  { key: 'frontSeatAdjustment', label: 'Front Seat Adjustment' },
  { key: 'doors', label: 'Doors (Open / Close / Lock)' },
  { key: 'horn', label: 'Horn' },
  { key: 'speedometer', label: 'Speedometer' },
  { key: 'bumpers', label: 'Bumpers' },
  { key: 'mufflerExhaustSystem', label: 'Muffler and Exhaust System' },
  { key: 'tires', label: 'Tires: Adequate Tread Depth, All Lug-nuts In Place' },
  { key: 'rearViewMirrors', label: 'Interior & Exterior Rear View Mirrors' },
  { key: 'safetyBelts', label: 'Safety Belts for Driver & Passengers' },
];

// Helper function to convert condition values to display text
const getConditionText = (condition: string) => {
  switch (condition) {
    case 'goodCondition':
      return 'Good';
    case 'poorCondition':
      return 'Poor';
    case 'badCondition':
      return 'Bad';
    case 'notApplicable':
      return 'N/A';
    default:
      return '';
  }
};

// Helper function to convert equipment type to display text
const getEquipmentTypeText = (type: string) => {
  const typeMap: { [key: string]: string } = {
    'backhoe': 'Backhoe',
    'excavator': 'Excavator',
    'paver': 'Paver',
    'bulldozer': 'Bulldozer',
    'forklist': 'Forklift',
    'snowcat': 'Snowcat',
    'compactor': 'Compactor',
    'grader': 'Grader',
    'yarder': 'Yarder',
    'crane': 'Crane',
    'harvester': 'Harvester'
  };
  return typeMap[type] || type;
};

// React PDF Document Component
const VehicleInspectionPDFDocument: React.FC<{ formData: VehicleInspectionFormData }> = ({ formData }) => {
  // Split inspection items into two columns for the layout
  const leftColumnItems = INSPECTION_ITEMS.slice(0, Math.ceil(INSPECTION_ITEMS.length / 2));
  const rightColumnItems = INSPECTION_ITEMS.slice(Math.ceil(INSPECTION_ITEMS.length / 2));

  const renderInspectionTable = () => {
    return (
      <View style={styles.inspectionTable}>
        {/* Header Row */}
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderCell}>Inspection Point</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={styles.tableHeaderCell}>Inspection Point</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
        </View>
        
        {/* Data Rows */}
        {Array.from({ length: Math.max(leftColumnItems.length, rightColumnItems.length) }).map((_, index) => {
          const leftItem = leftColumnItems[index];
          const rightItem = rightColumnItems[index];
          
          return (
            <View key={index} style={styles.tableRow}>
              {/* Left Column */}
              <Text style={styles.tableCellLeft}>
                {leftItem ? leftItem.label : ''}
              </Text>
              <Text style={styles.tableCell}>
                {leftItem ? getConditionText(formData[leftItem.key as keyof VehicleInspectionFormData] as string) : ''}
              </Text>
              
              {/* Right Column */}
              <Text style={styles.tableCellLeft}>
                {rightItem ? rightItem.label : ''}
              </Text>
              <Text style={styles.tableCell}>
                {rightItem ? getConditionText(formData[rightItem.key as keyof VehicleInspectionFormData] as string) : ''}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Vehicle Inspection</Text>
        
        {/* Basic Information - Two Column Layout */}
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Project Name:</Text>
            <Text style={styles.fieldValue}>{formData.projectName || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Date:</Text>
            <Text style={styles.fieldValue}>{formData.date || ''}</Text>
          </View>
        </View>
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Sub Name:</Text>
            <Text style={styles.fieldValue}>{formData.company || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Equipment Type:</Text>
            <Text style={styles.fieldValue}>{getEquipmentTypeText(formData.equipmentType) || ''}</Text>
          </View>
        </View>
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Project Location:</Text>
            <Text style={styles.fieldValue}></Text>
          </View>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Unit #:</Text>
            <Text style={styles.fieldValue}>{formData.unitNumber || ''}</Text>
          </View>
        </View>
        
        {/* Completed By - Single Column */}
        <View style={styles.fieldRowTwoColumn}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabelTwoColumn}>Completed By:</Text>
            <Text style={styles.fieldValue}>{formData.completedBy || ''}</Text>
          </View>
          <View style={styles.fieldColumn}>
            {/* Empty column to maintain layout */}
          </View>
        </View>

        {/* Inspection Table */}
        {renderInspectionTable()}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureHeader}>
            <Text>Signature:</Text>
          </View>
          <View style={styles.signatureBox}>
            {formData.signature && 
             typeof formData.signature === 'string' && 
             formData.signature.trim() !== '' && 
             (formData.signature.startsWith('data:image/') || formData.signature.startsWith('http')) ? (
              <Image style={styles.signatureImage} src={formData.signature} />
            ) : (
              <Text>Signature</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Main Export Component
const VehicleInspectionPdfExport: React.FC<VehicleInspectionPdfExportProps> = ({ 
  formData, 
  fileName = "vehicle-inspection-report.pdf" 
}) => {
  return (
    <div className="flex gap-2">
      <PDFDownloadLink
        document={<VehicleInspectionPDFDocument formData={formData} />}
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
export const generateAndDownloadVehicleInspectionPDF = async (formData: VehicleInspectionFormData, fileName: string) => {
  try {
    const doc = <VehicleInspectionPDFDocument formData={formData} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Vehicle Inspection PDF:', error);
    throw error;
  }
};

export default VehicleInspectionPdfExport;