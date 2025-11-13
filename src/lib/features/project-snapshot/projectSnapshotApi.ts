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
  projectManager?: string;
  page?: number;
  pageSize?: number;
  fetchAll?: boolean;
}

export interface GetProjectSnapshotFiltersParams {
  companyId: string;
  project?: string;
  subcontractor?: string;
  projectManager?: string;
}

export interface ProjectSnapshotMetrics {
  totalIncidents: number;
  trir: number;
  manHours: number;
  activeContractors: number;
  complianceRate: number;
  completionRate: number;
  totalProjectCost: number;
  totalSpent: number;
  spendPercentage: number;
}

export interface GetProjectSnapshotMetricsParams {
  companyId: string;
  project?: string;
  subcontractor?: string;
}

export interface ProjectTimelineData {
  project: {
    id: string;
    name: string;
    companyId: string;
    createdAt: string;
  };
  overallProgress: number;
  projectStartDate: string | null;
  projectEndDate: string | null;
  totalTasks: number;
  tasks: {
    id: string;
    taskNumber: number;
    name: string;
    durationDays: number | null;
    startDate: string | null;
    endDate: string | null;
    progress: string;
    predecessors: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  timelineData: {
    weeks: {
      weekNumber: number;
      label: string;
      startDate: string;
      endDate: string;
    }[];
    taskTimelines: {
      taskId: string;
      taskNumber: number;
      name: string;
      progress: number;
      startWeek: number | null;
      endWeek: number | null;
      duration: number;
      timeline: boolean[];
      startDate?: string | null;
      endDate?: string | null;
    }[];
  };
}

export interface GetProjectTimelineParams {
  projectId: string;
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
      query: ({ companyId, project, subcontractor, projectManager, page, pageSize, fetchAll }) => {
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

        if (projectManager) {
          params.append('projectManager', projectManager)
        }
        
        return `?${params}`
      },
      providesTags: ['ProjectSnapshot'],
    }),
    
    getProjectSnapshotProjects: builder.query<{name: string, location: string}[], GetProjectSnapshotFiltersParams>({
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
    
    getProjectSnapshotMetrics: builder.query<ProjectSnapshotMetrics, GetProjectSnapshotMetricsParams>({
      query: ({ companyId, project, subcontractor }) => {
        const params = new URLSearchParams({
          companyId,
        })
        
        if (project) {
          params.append('project', project)
        }
        
        if (subcontractor) {
          params.append('subcontractor', subcontractor)
        }
        
        return `/metrics?${params}`
      },
      providesTags: ['ProjectSnapshot'],
    }),

    getProjectTimeline: builder.query<ProjectTimelineData, GetProjectTimelineParams>({
      query: ({ projectId }) => {
        const params = new URLSearchParams({
          projectId,
        })
        
        return `../project-tasks/timeline?${params}`
      },
      providesTags: ['ProjectSnapshot'],
    }),

  }),
})

export const { 
  useGetProjectSnapshotQuery,
  useGetProjectSnapshotProjectsQuery,
  useGetProjectSnapshotSubcontractorsQuery,
  useGetProjectSnapshotMetricsQuery,
  useGetProjectTimelineQuery,
  useLazyGetProjectSnapshotQuery,
  useLazyGetProjectSnapshotProjectsQuery,
  useLazyGetProjectSnapshotSubcontractorsQuery,
  useLazyGetProjectSnapshotMetricsQuery,
  useLazyGetProjectTimelineQuery
} = projectSnapshotApi