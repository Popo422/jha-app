import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface FormTemplate {
  id: string
  name: string
  description: string | null
  modules: string[]
  companyId: string
  createdBy: string
  createdByName: string
  isDefault: string
  createdAt: string
  updatedAt: string
}

export interface FormTemplatesResponse {
  success: boolean
  templates: FormTemplate[]
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  modules: string[]
}

export interface CreateTemplateResponse {
  success: boolean
  template: FormTemplate
  message: string
}

export const formTemplatesApi = createApi({
  reducerPath: 'formTemplatesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/form-templates',
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
  tagTypes: ['FormTemplates'],
  endpoints: (builder) => ({
    getFormTemplates: builder.query<FormTemplatesResponse, void>({
      query: () => '',
      providesTags: ['FormTemplates'],
    }),
    createFormTemplate: builder.mutation<CreateTemplateResponse, CreateTemplateRequest>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['FormTemplates'],
    }),
  }),
})

export const {
  useGetFormTemplatesQuery,
  useCreateFormTemplateMutation,
} = formTemplatesApi