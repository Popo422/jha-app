"use client";

import CertifiedPayrollReportPreview from "@/components/admin/CertifiedPayrollReportPreview";

// Mock data for testing
const mockReportData = {
  weekStart: "2024-11-04",
  weekEnd: "2024-11-10", 
  projectName: "Highway Construction Project",
  workers: [
    {
      id: "1",
      name: "John Smith",
      address: "123 Main St, City, State 12345",
      ssn: "XXX-XX-1234",
      driversLicense: "DL123456789",
      ethnicity: "White",
      gender: "Male",
      workClassification: "Operating Engineer HWY 1/",
      location: "Project Site",
      type: "contractor",
      dailyHours: {
        sunday: { straight: 0, overtime: 0, double: 0 },
        monday: { straight: 8, overtime: 0, double: 0 },
        tuesday: { straight: 8, overtime: 2, double: 0 },
        wednesday: { straight: 8, overtime: 0, double: 0 },
        thursday: { straight: 8, overtime: 4, double: 0 },
        friday: { straight: 6, overtime: 0, double: 0 },
        saturday: { straight: 4, overtime: 0, double: 0 },
      },
      totalHours: { straight: 42, overtime: 6, double: 0 },
      baseHourlyRate: 28.50,
      overtimeRate: 42.75,
      doubleTimeRate: 57.00,
      grossAmount: 1462.50,
      deductions: {
        federalTax: 175.50,
        socialSecurity: 90.68,
        medicare: 21.21,
        stateTax: 65.81,
        localTaxesSDI: 14.63,
        allOtherDeductions: 25.00,
        totalDeduction: 392.83,
      },
      fringes: {
        healthWelfare: 125.00,
        pension: 85.50,
        training: 15.25,
      },
      payments: {
        checkNo: "CHK001234",
        netPaidWeek: 1069.67,
        savings: 50.00,
      }
    },
    {
      id: "2", 
      name: "Maria Garcia",
      address: "456 Oak Ave, City, State 12345",
      ssn: "XXX-XX-5678",
      driversLicense: "DL987654321",
      ethnicity: "Hispanic",
      gender: "Female",
      workClassification: "Laborer Common/",
      location: "Project Site",
      type: "subcontractor",
      dailyHours: {
        sunday: { straight: 0, overtime: 0, double: 0 },
        monday: { straight: 8, overtime: 0, double: 0 },
        tuesday: { straight: 8, overtime: 0, double: 0 },
        wednesday: { straight: 8, overtime: 2, double: 0 },
        thursday: { straight: 8, overtime: 2, double: 0 },
        friday: { straight: 8, overtime: 0, double: 0 },
        saturday: { straight: 0, overtime: 0, double: 0 },
      },
      totalHours: { straight: 40, overtime: 4, double: 0 },
      baseHourlyRate: 25.00,
      overtimeRate: 37.50,
      doubleTimeRate: 50.00,
      grossAmount: 1150.00,
      deductions: {
        federalTax: 138.00,
        socialSecurity: 71.30,
        medicare: 16.68,
        stateTax: 51.75,
        localTaxesSDI: 11.50,
        allOtherDeductions: 15.00,
        totalDeduction: 304.23,
      },
      fringes: {
        healthWelfare: 100.00,
        pension: 65.25,
        training: 12.50,
      },
      payments: {
        checkNo: "CHK001235",
        netPaidWeek: 845.77,
        savings: 25.00,
      }
    },
    {
      id: "3",
      name: "Robert Johnson", 
      address: "789 Pine Rd, City, State 12345",
      ssn: "XXX-XX-9012",
      driversLicense: "DL456123789",
      ethnicity: "Black",
      gender: "Male",
      workClassification: "Equipment Operator/",
      location: "Project Site", 
      type: "contractor",
      dailyHours: {
        sunday: { straight: 0, overtime: 0, double: 0 },
        monday: { straight: 8, overtime: 2, double: 0 },
        tuesday: { straight: 8, overtime: 3, double: 0 },
        wednesday: { straight: 8, overtime: 1, double: 0 },
        thursday: { straight: 8, overtime: 4, double: 2 },
        friday: { straight: 8, overtime: 0, double: 0 },
        saturday: { straight: 6, overtime: 0, double: 0 },
      },
      totalHours: { straight: 46, overtime: 10, double: 2 },
      baseHourlyRate: 32.00,
      overtimeRate: 48.00,
      doubleTimeRate: 64.00,
      grossAmount: 2080.00,
      deductions: {
        federalTax: 249.60,
        socialSecurity: 128.96,
        medicare: 30.16,
        stateTax: 93.60,
        localTaxesSDI: 20.80,
        allOtherDeductions: 35.00,
        totalDeduction: 558.12,
      },
      fringes: {
        healthWelfare: 150.00,
        pension: 105.75,
        training: 18.50,
      },
      payments: {
        checkNo: "CHK001236", 
        netPaidWeek: 1521.88,
        savings: 75.00,
      }
    }
  ]
};

export default function CertifiedPayrollPreviewPage() {
  const handleBack = () => {
    // For preview, just show an alert
    alert("Back button clicked - would normally navigate to wizard");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <CertifiedPayrollReportPreview 
        data={mockReportData}
        onBack={handleBack}
      />
    </div>
  );
}