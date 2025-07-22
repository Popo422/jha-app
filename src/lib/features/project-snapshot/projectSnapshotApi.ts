import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface ProjectSnapshotData {
  projectId: string;
  projectName: string;
  projectManager: string;
  contractorCount: number;
  totalSpend: number;
  subcontractorCount: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetProjectSnapshotResponse {
  projects: ProjectSnapshotData[];
  pagination: PaginationInfo | null;
}

export interface GetProjectSnapshotParams {
  companyId: string;
  project?: string;
  subcontractor?: string;
  page?: number;
  pageSize?: number;
  fetchAll?: boolean;
}

export interface GetProjectSnapshotFiltersParams {
  companyId: string;
  project?: string;
  subcontractor?: string;
}

export const projectSnapshotApi = createApi({
  reducerPath: 'projectSnapshotApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/project-snapshot',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      
      // Admin API so use admin token
      if (state.auth.adminToken && state.auth.isAdminAuthenticated) {
        headers.set('Authorization', `AdminBearer ${state.auth.adminToken}`)
      }
      
      // Ensure content-type is set for JSON requests
      if (!headers.get('content-type')) {
        headers.set('content-type', 'application/json')
      }
      
      return headers
    },
  }),
  tagTypes: ['ProjectSnapshot', 'ProjectSnapshotFilters'],
  endpoints: (builder) => ({
    getProjectSnapshot: builder.query<GetProjectSnapshotResponse, GetProjectSnapshotParams>({
      query: ({ companyId, project, subcontractor, page, pageSize, fetchAll }) => {
        const params = new URLSearchParams({
          companyId,
        })
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else if (page !== undefined && pageSize !== undefined) {
          params.append('page', page.toString())
          params.append('pageSize', pageSize.toString())
        }
        
        if (project) {
          params.append('project', project)
        }
        
        if (subcontractor) {
          params.append('subcontractor', subcontractor)
        }
        
        return `?${params}`
      },
      providesTags: ['ProjectSnapshot'],
    }),
    
    getProjectSnapshotProjects: builder.query<string[], GetProjectSnapshotFiltersParams>({
      query: ({ companyId, subcontractor }) => {
        const params = new URLSearchParams({
          companyId,
        })
        
        if (subcontractor) {
          params.append('subcontractor', subcontractor)
        }
        
        return `/projects?${params}`
      },
      providesTags: ['ProjectSnapshotFilters'],
    }),
    
    getProjectSnapshotSubcontractors: builder.query<string[], GetProjectSnapshotFiltersParams>({
      query: ({ companyId, project }) => {
        const params = new URLSearchParams({
          companyId,
        })
        
        if (project) {
          params.append('project', project)
        }
        
        return `/subcontractors?${params}`
      },
      providesTags: ['ProjectSnapshotFilters'],
    }),
  }),
})

export const { 
  useGetProjectSnapshotQuery,
  useGetProjectSnapshotProjectsQuery,
  useGetProjectSnapshotSubcontractorsQuery,
  useLazyGetProjectSnapshotQuery,
  useLazyGetProjectSnapshotProjectsQuery,
  useLazyGetProjectSnapshotSubcontractorsQuery
} = projectSnapshotApi