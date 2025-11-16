import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  rate: string;
  overtimeRate?: string;
  doubleTimeRate?: string;
  companyName?: string;
  language: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  dateOfHire?: string;
  workClassification?: string;
  projectType?: string;
  group?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractorRequest {
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  rate: string;
  overtimeRate?: string;
  doubleTimeRate?: string;
  language: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  dateOfHire?: string;
  workClassification?: string;
  projectType?: string;
  group?: number;
}

export interface UpdateContractorRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  rate: string;
  overtimeRate?: string;
  doubleTimeRate?: string;
  language: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  dateOfHire?: string;
  workClassification?: string;
  projectType?: string;
  group?: number;
}


export interface ContractorsResponse {
  success: boolean;
  contractors: Contractor[];
}

export interface ContractorResponse {
  success: boolean;
  contractor: Contractor;
  message: string;
}

export interface DeleteContractorResponse {
  success: boolean;
  message: string;
}

export const contractorManagementApi = createApi({
  reducerPath: 'contractorManagementApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/contractors',
    credentials: 'include',
  }),
  tagTypes: ['Contractor'],
  endpoints: (builder) => ({
    getCompanyContractors: builder.query<ContractorsResponse, void>({
      query: () => '/company-contractors',
      providesTags: (result) =>
        result
          ? [
              ...result.contractors.map(({ id }) => ({ type: 'Contractor' as const, id })),
              { type: 'Contractor', id: 'LIST' },
            ]
          : [{ type: 'Contractor', id: 'LIST' }],
    }),

    createContractor: builder.mutation<ContractorResponse, CreateContractorRequest>({
      query: (contractor) => ({
        url: '/company-contractors',
        method: 'POST',
        body: contractor,
      }),
      invalidatesTags: [{ type: 'Contractor', id: 'LIST' }],
    }),

    updateContractor: builder.mutation<ContractorResponse, UpdateContractorRequest>({
      query: ({ id, ...contractor }) => ({
        url: `/company-contractors/${id}`,
        method: 'PUT',
        body: contractor,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Contractor', id },
        { type: 'Contractor', id: 'LIST' },
      ],
    }),

    deleteContractor: builder.mutation<DeleteContractorResponse, string>({
      query: (id) => ({
        url: `/company-contractors/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Contractor', id },
        { type: 'Contractor', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCompanyContractorsQuery,
  useCreateContractorMutation,
  useUpdateContractorMutation,
  useDeleteContractorMutation,
} = contractorManagementApi;