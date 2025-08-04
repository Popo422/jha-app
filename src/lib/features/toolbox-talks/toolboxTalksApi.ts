import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ToolboxTalk {
  id: string
  title: string
  content: string
  status: 'draft' | 'published'
  authorName: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ToolboxTalksResponse {
  toolboxTalks: ToolboxTalk[]
  pagination?: PaginationInfo | null
}

export interface CreateToolboxTalkRequest {
  title: string
  content: string
  status: 'draft' | 'published'
  authorName: string
}

export interface UpdateToolboxTalkRequest {
  id: string
  title: string
  content: string
  status: 'draft' | 'published'
  authorName: string
}

export interface ToolboxTalkResponse {
  success: boolean
  toolboxTalk?: ToolboxTalk
  message?: string
  error?: string
}

export interface ToolboxTalkReadEntry {
  id: string
  toolboxTalkId: string
  toolboxTalkTitle?: string
  companyId: string
  readBy: string
  dateRead: string
  signature: string
  createdAt: string
  updatedAt: string
}

export interface CreateReadEntryRequest {
  toolboxTalkId: string
  companyId: string
  readBy: string
  dateRead: string
  signature: string
}

export interface ReadEntriesResponse {
  readEntries: ToolboxTalkReadEntry[]
  stats?: {
    toolboxTalkId: string
    toolboxTalkTitle?: string
    readCount: number
    latestRead: string
  }[]
  pagination?: PaginationInfo
}

export interface CreateReadEntryResponse {
  message: string
  readEntry: ToolboxTalkReadEntry
}

export const toolboxTalksApi = createApi({
  reducerPath: 'toolboxTalksApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/toolbox-talks',
    prepareHeaders: (headers) => {
      // Get admin token from cookie
      if (typeof window !== 'undefined') {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminAuthToken='))
          ?.split('=')[1]
        
        if (token) {
          headers.set('Authorization', `AdminBearer ${token}`)
        }
      }
      return headers
    },
  }),
  tagTypes: ['ToolboxTalk'],
  endpoints: (builder) => ({
    getToolboxTalks: builder.query<ToolboxTalksResponse, { page?: number; pageSize?: number; fetchAll?: boolean }>({
      query: ({ page = 1, pageSize = 50, fetchAll } = {}) => {
        const params = new URLSearchParams()
        
        if (fetchAll) {
          params.append('fetchAll', 'true')
        } else {
          params.append('page', page.toString())
          params.append('pageSize', pageSize.toString())
        }
        
        return `?${params}`
      },
      providesTags: ['ToolboxTalk'],
    }),
    createToolboxTalk: builder.mutation<ToolboxTalkResponse, CreateToolboxTalkRequest>({
      query: (toolboxTalk) => ({
        url: '',
        method: 'POST',
        body: toolboxTalk,
      }),
      invalidatesTags: ['ToolboxTalk'],
    }),
    updateToolboxTalk: builder.mutation<ToolboxTalkResponse, UpdateToolboxTalkRequest>({
      query: (toolboxTalk) => ({
        url: '',
        method: 'PUT',
        body: toolboxTalk,
      }),
      invalidatesTags: ['ToolboxTalk'],
    }),
    deleteToolboxTalk: builder.mutation<ToolboxTalkResponse, string>({
      query: (id) => ({
        url: '',
        method: 'DELETE',
        body: { id },
      }),
      invalidatesTags: ['ToolboxTalk'],
    }),
    // Toolbox Talk Read Entry endpoints
    createReadEntry: builder.mutation<CreateReadEntryResponse, CreateReadEntryRequest>({
      queryFn: async (readEntry) => {
        try {
          const response = await fetch('/api/toolbox-talk-read-entries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(readEntry),
          })
          
          const data = await response.json()
          
          if (!response.ok) {
            return { error: data }
          }
          
          return { data }
        } catch (error) {
          return { error: { error: 'Network error' } }
        }
      },
      invalidatesTags: ['ToolboxTalk'],
    }),
    getReadEntries: builder.query<ReadEntriesResponse, { 
      companyId: string
      toolboxTalkId?: string
      search?: string
      page?: number
      pageSize?: number 
    }>({
      queryFn: async ({ companyId, toolboxTalkId, search, page = 1, pageSize = 50 }) => {
        try {
          const params = new URLSearchParams()
          params.append('companyId', companyId)
          if (toolboxTalkId) params.append('toolboxTalkId', toolboxTalkId)
          if (search) params.append('search', search)
          params.append('page', page.toString())
          params.append('pageSize', pageSize.toString())
          
          const response = await fetch(`/api/toolbox-talk-read-entries?${params}`)
          
          const data = await response.json()
          
          if (!response.ok) {
            return { error: data }
          }
          
          return { data }
        } catch (error) {
          return { error: { error: 'Network error' } }
        }
      },
      providesTags: ['ToolboxTalk'],
    }),
  }),
})

export const {
  useGetToolboxTalksQuery,
  useLazyGetToolboxTalksQuery,
  useCreateToolboxTalkMutation,
  useUpdateToolboxTalkMutation,
  useDeleteToolboxTalkMutation,
  useCreateReadEntryMutation,
  useGetReadEntriesQuery,
  useLazyGetReadEntriesQuery,
} = toolboxTalksApi