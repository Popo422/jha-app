import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export interface Incident {
  id: string
  reportedBy: string
  injuredEmployee: string
  projectName: string
  dateReported: string
  dateOfIncident: string
  incidentType: 'incident-report' | 'quick-incident-report'
  company: string
  subcontractor?: string
  description?: string
  injuryType?: string
  bodyPart?: string
  witnessName?: string
  witnessStatement?: string
  immediateAction?: string
  rootCause?: string
  preventiveMeasures?: string
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  status: 'reported' | 'investigating' | 'closed'
  attachments?: string[]
  formData?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface IncidentData {
  reportedBy: string
  injuredEmployee: string
  projectName: string
  dateOfIncident: string
  incidentType: 'incident-report' | 'quick-incident-report'
  company: string
  subcontractor?: string
  description?: string
  injuryType?: string
  bodyPart?: string
  witnessName?: string
  witnessStatement?: string
  immediateAction?: string
  rootCause?: string
  preventiveMeasures?: string
  severity?: 'minor' | 'moderate' | 'major' | 'critical'
  formData?: Record<string, any>
  files?: File[]
  authType?: 'contractor' | 'admin' | 'any'
}

export interface IncidentResponse {
  success: boolean
  incident?: Incident
  error?: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface GetIncidentsResponse {
  incidents: Incident[]
  pagination?: PaginationInfo | null
  meta: {
    limit: number | null
    offset: number | null
    fetchAll?: boolean
    isAdmin: boolean
    userId: string | null
  }
}

export interface DeleteIncidentResponse {
  success: boolean
  message?: string
  error?: string
}

export interface UpdateIncidentData {
  id: string
  reportedBy?: string
  injuredEmployee?: string
  projectName?: string
  dateOfIncident?: string
  company?: string
  subcontractor?: string
  description?: string
  injuryType?: string
  bodyPart?: string
  witnessName?: string
  witnessStatement?: string
  immediateAction?: string
  rootCause?: string
  preventiveMeasures?: string
  severity?: 'minor' | 'moderate' | 'major' | 'critical'
  status?: 'reported' | 'investigating' | 'closed'
  formData?: Record<string, any>
}

export interface UpdateIncidentResponse {
  success: boolean
  incident?: Incident
  message?: string
  error?: string
}


export const incidentsApi = createApi({
  reducerPath: 'incidentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/incidents',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      
      // Check for admin token first (admin has priority)
      if (state.auth.adminToken && state.auth.isAdminAuthenticated) {
        headers.set('Authorization', `AdminBearer ${state.auth.adminToken}`)
      }
      // Otherwise use regular user token
      else if (state.auth.token && state.auth.isAuthenticated) {
        headers.set('Authorization', `Bearer ${state.auth.token}`)
      }
      
      return headers
    },
  }),
  tagTypes: ['Incident', 'WorkersCompData'],
  endpoints: (builder) => ({
    createIncident: builder.mutation<IncidentResponse, IncidentData>({
      query: (data) => {
        const formData = new FormData()
        
        // Add form fields
        formData.append('reportedBy', data.reportedBy)
        formData.append('injuredEmployee', data.injuredEmployee)
        formData.append('projectName', data.projectName)
        formData.append('dateOfIncident', data.dateOfIncident)
        formData.append('incidentType', data.incidentType)
        formData.append('company', data.company)
        
        if (data.subcontractor) formData.append('subcontractor', data.subcontractor)
        if (data.description) formData.append('description', data.description)
        if (data.injuryType) formData.append('injuryType', data.injuryType)
        if (data.bodyPart) formData.append('bodyPart', data.bodyPart)
        if (data.witnessName) formData.append('witnessName', data.witnessName)
        if (data.witnessStatement) formData.append('witnessStatement', data.witnessStatement)
        if (data.immediateAction) formData.append('immediateAction', data.immediateAction)
        if (data.rootCause) formData.append('rootCause', data.rootCause)
        if (data.preventiveMeasures) formData.append('preventiveMeasures', data.preventiveMeasures)
        if (data.severity) formData.append('severity', data.severity)
        if (data.formData) formData.append('formData', JSON.stringify(data.formData))
        
        // Add files if any
        if (data.files) {
          data.files.forEach(file => {
            formData.append('files', file)
          })
        }

        // Add authType to URL if specified
        let url = ''
        if (data.authType) {
          url = `?authType=${data.authType}`
        }

        return {
          url,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['Incident', 'WorkersCompData'],
    }),
    getIncidents: builder.query<GetIncidentsResponse, { 
      incidentType?: string
      dateFrom?: string
      dateTo?: string
      company?: string
      status?: string
      severity?: string
      search?: string
      page?: number
      pageSize?: number
      limit?: number
      offset?: number
      fetchAll?: boolean
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: ({ 
        incidentType, 
        dateFrom, 
        dateTo, 
        company, 
        status, 
        severity, 
        search, 
        page, 
        pageSize, 
        limit, 
        offset, 
        fetchAll, 
        authType 
      }) => {
        const params = new URLSearchParams()
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else {
          // Use page/pageSize if provided, otherwise fall back to limit/offset
          if (page !== undefined && pageSize !== undefined) {
            params.append('page', page.toString())
            params.append('pageSize', pageSize.toString())
          } else {
            params.append('limit', (limit || 50).toString())
            params.append('offset', (offset || 0).toString())
          }
        }
        
        if (incidentType) params.append('incidentType', incidentType)
        if (dateFrom) params.append('dateFrom', dateFrom)
        if (dateTo) params.append('dateTo', dateTo)
        if (company) params.append('company', company)
        if (status) params.append('status', status)
        if (severity) params.append('severity', severity)
        if (search) params.append('search', search)
        if (authType) params.append('authType', authType)
        
        return `?${params}`
      },
      providesTags: ['Incident'],
    }),
    getIncidentById: builder.query<{ incident: Incident }, { id: string, authType?: 'contractor' | 'admin' | 'any' }>({
      query: ({ id, authType }) => {
        const params = new URLSearchParams()
        if (authType) params.append('authType', authType)
        return `/${id}?${params}`
      },
      providesTags: (result, error, { id }) => [{ type: 'Incident', id }],
    }),
    updateIncident: builder.mutation<UpdateIncidentResponse, UpdateIncidentData & { authType?: 'contractor' | 'admin' | 'any' }>({
      query: ({ authType, ...data }) => {
        let url = `/${data.id}`
        if (authType) {
          url += `?authType=${authType}`
        }
        return {
          url,
          method: 'PUT',
          body: data,
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Incident', id }, 'WorkersCompData'],
    }),
    deleteIncident: builder.mutation<DeleteIncidentResponse, { id: string, authType?: 'contractor' | 'admin' | 'any' }>({
      query: ({ id, authType }) => {
        const params = new URLSearchParams()
        if (authType) params.append('authType', authType)
        return {
          url: `/${id}?${params}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: ['Incident', 'WorkersCompData'],
    }),
    exportIncidents: builder.mutation<Blob, { 
      incidentType?: string
      dateFrom?: string
      dateTo?: string
      company?: string
      status?: string
      severity?: string
      format?: 'csv' | 'excel'
      authType?: 'contractor' | 'admin' | 'any'
    }>({
      query: (params) => ({
        url: '/export',
        method: 'POST',
        body: params,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const { 
  useCreateIncidentMutation,
  useGetIncidentsQuery,
  useLazyGetIncidentsQuery,
  useGetIncidentByIdQuery,
  useUpdateIncidentMutation,
  useDeleteIncidentMutation,
  useExportIncidentsMutation
} = incidentsApi