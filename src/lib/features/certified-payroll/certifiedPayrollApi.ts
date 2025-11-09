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
}

export interface CertifiedPayrollData {
  weekStart: string;
  weekEnd: string;
  projectName: string;
  workers: PayrollWorker[];
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
  }),
});

export const {
  useGetCertifiedPayrollQuery,
} = certifiedPayrollApi;