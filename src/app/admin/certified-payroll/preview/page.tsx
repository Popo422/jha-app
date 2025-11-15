"use client";

import { useState } from 'react';
import CertifiedPayrollReportPreview from "@/components/admin/CertifiedPayrollReportPreview";

// Mock data for testing
const mockReportData = {
  weekStart: "2024-11-04",
  weekEnd: "2024-11-10", 
  projectName: "Highway Construction Project",
  projectInfo: {
    name: "Highway Construction Project",
    location: "Highway 101, Mile Markers 10-25",
    projectCode: "HWY-2024-001",
    contractId: "DOT-Contract-789456",
    projectManager: "Sarah Johnson",
    startDate: "2024-10-01",
    endDate: "2024-12-31"
  },
  subcontractorInfo: {
    companyName: "ABC Construction Services LLC",
    trade: "Heavy Highway Construction",
    contractorLicenseNo: "CLN-123456789",
    specialtyLicenseNo: "SLN-987654321",
    federalTaxId: "12-3456789",
    motorCarrierPermitNo: "MCP-555888",
    isUnion: true,
    isSelfInsured: false,
    workersCompPolicy: "WCP-Policy-2024-001",
    email: "contact@abcconstruction.com",
    phone: "(555) 123-4567",
    address: "1234 Industrial Blvd, Construction City, CA 90210",
    contact: "Mike Rodriguez",
    foreman: "Tony Martinez"
  },
  workers: [
    {
      id: "1",
      name: "John Smith",
      address: "123 Main St, City, State 12345",
      ssn: "XXX-XX-1234",
      driversLicense: "DL123456789",
      ethnicity: "White",
      gender: "Male",
      workClassification: "Operating Engineer",
      projectType: "HWY",
      group: "1",
      location: "Highway 101 Mile Marker 15",
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
        voluntaryPension: 45.00,
        voluntaryMedical: 32.50,
        vacDues: 28.75,
        travSubs: 18.25,
        allOtherDeductions: 82.000,
        totalDeduction: 517.33,
      },
      fringes: {
        rateInLieuOfFringes: 0.00,
        totalBaseRatePlusFringes: 35.85,
        hwRate: 2.50,
        healthWelfare: 125.00,
        pensionRate: 1.75,
        pension: 85.50,
        vacHolRate: 0.85,
        vacationHoliday: 41.65,
        trainingRate: 0.35,
        training: 15.25,
        allOtherRate: 1.25,
        totalFringeRateToThird: 6.70,
        totalFringesPaidToThird: 267.40,
      },
      payments: {
        checkNo: "CHK001234",
        netPaidWeek: 945.17,
        savings: 50.00,
        payrollPaymentDate: "2024-11-15",
      },
      additionalInfo: {
        fringesPaidToEmployee: "No",
        vacationHolidayDuesInGrossPay: "Yes", 
        voluntaryContributionsInGrossPay: "No",
        dateOfHire: "03/15/2023"
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
      workClassification: "Laborer Common",
      projectType: "BLD",
      group: "2",
      location: "Building Site Foundation Area",
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
        voluntaryPension: 35.00,
        voluntaryMedical: 25.75,
        vacDues: 22.50,
        travSubs: 15.25,
        allOtherDeductions: 140.430,
        totalDeduction: 402.73,
      },
      fringes: {
        rateInLieuOfFringes: 0.00,
        totalBaseRatePlusFringes: 31.25,
        hwRate: 2.25,
        healthWelfare: 100.00,
        pensionRate: 1.50,
        pension: 65.25,
        vacHolRate: 0.75,
        vacationHoliday: 33.00,
        trainingRate: 0.30,
        training: 12.50,
        allOtherRate: 1.00,
        totalFringeRateToThird: 5.80,
        totalFringesPaidToThird: 210.75,
      },
      payments: {
        checkNo: "CHK001235",
        netPaidWeek: 747.27,
        savings: 25.00,
        payrollPaymentDate: "2024-11-15",
      },
      additionalInfo: {
        fringesPaidToEmployee: "No",
        vacationHolidayDuesInGrossPay: "Yes",
        voluntaryContributionsInGrossPay: "No",
        dateOfHire: "08/22/2022"
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
      workClassification: "Equipment Operator",
      projectType: "FLT",
      group: "3",
      location: "Flatwork Concrete Pour Zone",
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
        voluntaryPension: 55.00,
        voluntaryMedical: 42.50,
        vacDues: 38.75,
        travSubs: 25.00,
        allOtherDeductions: 155.800,
        totalDeduction: 719.37,
      },
      fringes: {
        rateInLieuOfFringes: 0.00,
        totalBaseRatePlusFringes: 42.15,
        hwRate: 3.00,
        healthWelfare: 150.00,
        pensionRate: 2.25,
        pension: 105.75,
        vacHolRate: 1.10,
        vacationHoliday: 52.25,
        trainingRate: 0.45,
        training: 18.50,
        allOtherRate: 1.50,
        totalFringeRateToThird: 8.30,
        totalFringesPaidToThird: 326.50,
      },
      payments: {
        checkNo: "CHK001236", 
        netPaidWeek: 1360.63,
        savings: 75.00,
        payrollPaymentDate: "2024-11-15",
      },
      additionalInfo: {
        fringesPaidToEmployee: "No",
        vacationHolidayDuesInGrossPay: "Yes",
        voluntaryContributionsInGrossPay: "No",
        dateOfHire: "01/10/2024"
      }
    }
  ],
  certification: {
    certificationDate: "2024-12-01",
    projectManager: "Sarah Johnson",
    position: "Project Manager",
    companyName: "ABC Construction Services LLC",
    projectName: "Highway Construction Project",
    payrollStartDate: "2024-11-04",
    payrollEndDate: "2024-11-10",
    fringeBenefitsOption: "plans" as "plans" | "cash",
    exceptions: [
      {
        exception: "Apprentice Carpenter",
        explanation: "First year apprentice working under supervision, reduced wage rate per apprenticeship agreement"
      },
      {
        exception: "Equipment Operator Trainee", 
        explanation: "Training period - 90% of journeyman rate as per union contract"
      }
    ],
    remarks: "All workers have completed required safety training. Project is on schedule and within budget parameters.",
    signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  }
};

// Multi-week mock data example
const mockMultiWeekReportData = {
  weekStart: "2024-11-04",
  weekEnd: "2024-11-17", 
  projectName: "Highway Construction Project - Multi Week",
  projectInfo: {
    name: "Highway Construction Project - Multi Week",
    location: "Highway 101, Mile Markers 10-25",
    projectCode: "HWY-2024-001",
    contractId: "DOT-Contract-789456",
    projectManager: "Sarah Johnson",
    startDate: "2024-10-01",
    endDate: "2024-12-31"
  },
  subcontractorInfo: {
    companyName: "ABC Construction Services LLC",
    trade: "Heavy Highway Construction",
    contractorLicenseNo: "CLN-123456789",
    specialtyLicenseNo: "SLN-987654321",
    federalTaxId: "12-3456789",
    motorCarrierPermitNo: "MCP-555888",
    isUnion: true,
    isSelfInsured: false,
    workersCompPolicy: "WCP-Policy-2024-001",
    email: "contact@abcconstruction.com",
    phone: "(555) 123-4567",
    address: "1234 Industrial Blvd, Construction City, CA 90210",
    contact: "Mike Rodriguez",
    foreman: "Tony Martinez"
  },
  workers: [], // Not used for multi-week
  weeks: [
    {
      weekStart: "2024-11-04",
      weekEnd: "2024-11-10",
      workers: [
        {
          id: "1",
          name: "John Smith",
          address: "123 Main St, City, State 12345",
          ssn: "XXX-XX-1234",
          driversLicense: "DL123456789",
          ethnicity: "White",
          gender: "Male",
          workClassification: "Operating Engineer",
          projectType: "HWY",
          group: "1",
          location: "Highway 101 Mile Marker 15",
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
            voluntaryPension: 45.00,
            voluntaryMedical: 32.50,
            vacDues: 28.75,
            travSubs: 18.25,
            allOtherDeductions: 25.00,
            totalDeduction: 517.33,
          },
          fringes: {
            rateInLieuOfFringes: 0.00,
            totalBaseRatePlusFringes: 35.85,
            hwRate: 2.50,
            healthWelfare: 125.00,
            pensionRate: 1.75,
            pension: 85.50,
            vacHolRate: 0.85,
            vacationHoliday: 41.65,
            trainingRate: 0.35,
            training: 15.25,
            allOtherRate: 1.25,
            totalFringeRateToThird: 6.70,
            totalFringesPaidToThird: 267.40,
          },
          payments: {
            checkNo: "CHK001234",
            netPaidWeek: 945.17,
            savings: 50.00,
            payrollPaymentDate: "2024-11-15",
          },
          additionalInfo: {
            fringesPaidToEmployee: "No",
            vacationHolidayDuesInGrossPay: "Yes", 
            voluntaryContributionsInGrossPay: "No",
          }
        }
      ]
    },
    {
      weekStart: "2024-11-11",
      weekEnd: "2024-11-17",
      workers: [
        {
          id: "1",
          name: "John Smith",
          address: "123 Main St, City, State 12345",
          ssn: "XXX-XX-1234",
          driversLicense: "DL123456789",
          ethnicity: "White",
          gender: "Male",
          workClassification: "Operating Engineer",
          projectType: "HWY",
          group: "1",
          location: "Highway 101 Mile Marker 15",
          dailyHours: {
            sunday: { straight: 0, overtime: 0, double: 0 },
            monday: { straight: 8, overtime: 2, double: 0 },
            tuesday: { straight: 8, overtime: 0, double: 0 },
            wednesday: { straight: 8, overtime: 3, double: 0 },
            thursday: { straight: 8, overtime: 1, double: 0 },
            friday: { straight: 8, overtime: 0, double: 0 },
            saturday: { straight: 0, overtime: 0, double: 0 },
          },
          totalHours: { straight: 40, overtime: 6, double: 0 },
          baseHourlyRate: 28.50,
          overtimeRate: 42.75,
          doubleTimeRate: 57.00,
          grossAmount: 1396.50,
          deductions: {
            federalTax: 167.58,
            socialSecurity: 86.58,
            medicare: 20.25,
            stateTax: 62.84,
            localTaxesSDI: 13.97,
            voluntaryPension: 42.00,
            voluntaryMedical: 30.25,
            vacDues: 27.50,
            travSubs: 17.50,
            allOtherDeductions: 23.00,
            totalDeduction: 491.47,
          },
          fringes: {
            rateInLieuOfFringes: 0.00,
            totalBaseRatePlusFringes: 35.85,
            hwRate: 2.50,
            healthWelfare: 115.00,
            pensionRate: 1.75,
            pension: 80.50,
            vacHolRate: 0.85,
            vacationHoliday: 39.10,
            trainingRate: 0.35,
            training: 14.35,
            allOtherRate: 1.25,
            totalFringeRateToThird: 6.70,
            totalFringesPaidToThird: 248.95,
          },
          payments: {
            checkNo: "CHK001245",
            netPaidWeek: 905.03,
            savings: 45.00,
            payrollPaymentDate: "2024-11-22",
          },
          additionalInfo: {
            fringesPaidToEmployee: "No",
            vacationHolidayDuesInGrossPay: "Yes", 
            voluntaryContributionsInGrossPay: "No",
          }
        }
      ]
    }
  ],
  certification: {
    certificationDate: "2024-12-01",
    projectManager: "Sarah Johnson",
    position: "Senior Project Manager", 
    companyName: "ABC Construction Services LLC",
    projectName: "Highway Construction Project - Multi Week",
    payrollStartDate: "2024-11-04",
    payrollEndDate: "2024-11-17",
    fringeBenefitsOption: "cash" as "plans" | "cash",
    exceptions: [
      {
        exception: "Heavy Equipment Operator",
        explanation: "Certified operator with additional safety premium per collective bargaining agreement"
      }
    ],
    remarks: "Multi-week certification covering two consecutive payroll periods. All safety protocols followed.",
    signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  }
};

export default function CertifiedPayrollPreviewPage() {
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('multi');
  
  const handleBack = () => {
    // For preview, just show an alert
    alert("Back button clicked - would normally navigate to wizard");
  };

  const currentData = viewMode === 'single' ? mockReportData : mockMultiWeekReportData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Toggle between single and multi-week views */}
      <div className="mb-4 flex gap-4 justify-center">
        <button 
          onClick={() => setViewMode('single')}
          className={`px-4 py-2 rounded ${viewMode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Single Week View
        </button>
        <button 
          onClick={() => setViewMode('multi')}
          className={`px-4 py-2 rounded ${viewMode === 'multi' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Multi-Week View (2 weeks)
        </button>
      </div>

      <CertifiedPayrollReportPreview 
        generateReportData={async () => currentData}
        isCalculating={false}
        onBack={handleBack}
      />
    </div>
  );
}