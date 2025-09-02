import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../../store';

export interface WorkersCompMetrics {
  recentIncidents: number;
  needsAttention: number;
  nearMisses: number;
  trir: number;
}

export interface ActionItem {
  id: number;
  type: 'review' | 'insurance' | 'training' | 'compliance';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface WorkersCompData {
  metrics: WorkersCompMetrics;
  actionItems: ActionItem[];
  lastUpdated: string;
}

export const workersCompApi = createApi({
  reducerPath: 'workersCompApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/workers-comp',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['WorkersCompData'],
  endpoints: (builder) => ({
    getWorkersCompData: builder.query<WorkersCompData, void>({
      query: () => '',
      providesTags: ['WorkersCompData'],
    }),
  }),
});

export const { 
  useGetWorkersCompDataQuery,
} = workersCompApi;