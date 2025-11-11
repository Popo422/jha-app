import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Types
export interface PayrollWorker {
  id: string;
  name: string;
  address: string;
  ssn: string;
  driversLicense: string;
  ethnicity: string;
  gender: string;
  workClassification: string;
  location: string;
  type: string;
  dailyHours: {
    sunday: { straight: number; overtime: number; double: number };
    monday: { straight: number; overtime: number; double: number };
    tuesday: { straight: number; overtime: number; double: number };
    wednesday: { straight: number; overtime: number; double: number };
    thursday: { straight: number; overtime: number; double: number };
    friday: { straight: number; overtime: number; double: number };
    saturday: { straight: number; overtime: number; double: number };
  };
  totalHours: { straight: number; overtime: number; double: number };
  baseHourlyRate: number;
  overtimeRate: number;
  doubleTimeRate: number;
  grossAmount: number;
  deductions?: {
    federalTax: number;
    socialSecurity: number;
    medicare: number;
    stateTax: number;
    localTaxesSDI: number;
    voluntaryPension: number;
    voluntaryMedical: number;
    vacDues: number;
    travSubs: number;
    allOtherDeductions: number;
    totalDeduction: number;
  };
  fringes?: {
    rateInLieuOfFringes: number;
    totalBaseRatePlusFringes: number;
    hwRate: number;
    healthWelfare: number;
    pensionRate: number;
    pension: number;
    vacHolRate: number;
    vacationHoliday: number;
    trainingRate: number;
    training: number;
    allOtherRate: number;
    totalFringeRateToThird: number;
    totalFringesPaidToThird: number;
  };
  payments?: {
    checkNo: string;
    netPaidWeek: number;
    savings: number;
    payrollPaymentDate: string;
  };
  additionalInfo?: {
    fringesPaidToEmployee: string;
    vacationHolidayDuesInGrossPay: string;
    voluntaryContributionsInGrossPay: string;
  };
}

export interface CertifiedPayrollData {
  weekStart: string;
  weekEnd: string;
  projectName: string;
  workers: PayrollWorker[];
}

export interface PayrollWeekData {
  weekStart: string;
  weekEnd: string;
  workers: PayrollWorker[];
}

export interface MultiWeekPayrollData {
  weekStart: string;
  weekEnd: string;
  projectName: string;
  weeks: PayrollWeekData[];
}

export interface CalculateMultiWeekRequest {
  projectId: string;
  startDate: string;
  endDate: string;
  selectedContractorIds: string[];
  payrollData: Record<string, any>;
}

export interface CalculateMultiWeekResponse {
  success: boolean;
  data: MultiWeekPayrollData;
}

export interface ProjectContractor {
  id: string;
  name: string;
  email: string;
  totalProjectHours: number;
  grossEarned: number;
  dateOfHire: string;
  rate: number;
  type: string;
  role: string;
}

export interface ProjectContractorsResponse {
  contractors: ProjectContractor[];
  totalContractors: number;
}

export interface UploadPayrollRequest {
  file?: File;
  url?: string;
}

export interface UploadPayrollResponse {
  success: boolean;
  fileUrl: string;
  fileName: string;
  message: string;
}

export interface ExtractPayrollRequest {
  fileUrl: string;
  contractorName?: string;
}

export interface ExtractPayrollResponse {
  success: boolean;
  extractedData: any;
  message: string;
  rawResponse?: string;
}

interface GetCertifiedPayrollParams {
  projectId: string;
  weekStart: string; // YYYY-MM-DD format
  weekEnd: string;   // YYYY-MM-DD format
}

export const certifiedPayrollApi = createApi({
  reducerPath: 'certifiedPayrollApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/certified-payroll',
    credentials: 'include',
  }),
  tagTypes: ['CertifiedPayroll'],
  endpoints: (builder) => ({
    getCertifiedPayroll: builder.query<CertifiedPayrollData, GetCertifiedPayrollParams>({
      query: ({ projectId, weekStart, weekEnd }) => ({
        url: `/${projectId}`,
        params: {
          weekStart,
          weekEnd,
        },
      }),
      providesTags: ['CertifiedPayroll'],
    }),
    getProjectContractors: builder.query<ProjectContractorsResponse, string>({
      query: (projectId) => ({
        url: `/${projectId}/contractors`,
      }),
      providesTags: ['CertifiedPayroll'],
    }),
    uploadPayroll: builder.mutation<UploadPayrollResponse, UploadPayrollRequest>({
      queryFn: async (arg, api, extraOptions, baseQuery) => {
        const { file, url } = arg as UploadPayrollRequest;
        const formData = new FormData();
        if (file) formData.append('file', file);
        if (url) formData.append('url', url);
        
        const response = await fetch('/api/admin/certified-payroll/upload-payroll', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: { status: response.status, data } };
        }

        return { data };
      },
    }),
    extractPayroll: builder.mutation<ExtractPayrollResponse, ExtractPayrollRequest>({
      query: (body) => ({
        url: '/extract-payroll',
        method: 'POST',
        body,
      }),
    }),
    calculateMultiWeekPayroll: builder.mutation<CalculateMultiWeekResponse, CalculateMultiWeekRequest>({
      query: (body) => ({
        url: '/calculate-multi-week',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CertifiedPayroll'],
    }),
  }),
});

export const {
  useGetCertifiedPayrollQuery,
  useGetProjectContractorsQuery,
  useUploadPayrollMutation,
  useExtractPayrollMutation,
  useCalculateMultiWeekPayrollMutation,
} = certifiedPayrollApi;