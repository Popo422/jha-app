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
  pagination?: PaginationInfo
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
    getToolboxTalks: builder.query<ToolboxTalksResponse, { page?: number; pageSize?: number }>({
      query: ({ page = 1, pageSize = 50 } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
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
  }),
})

export const {
  useGetToolboxTalksQuery,
  useCreateToolboxTalkMutation,
  useUpdateToolboxTalkMutation,
  useDeleteToolboxTalkMutation,
} = toolboxTalksApi